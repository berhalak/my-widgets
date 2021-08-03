const { Subject, interval, fromEvent, combineLatest } = rxjs;
const { debounceTime, skip, take, concatWith, mergeWith } = rxjs.operators;

// create ready event from dom and alpline
const ready = combineLatest([
  fromEvent(window, 'DOMContentLoaded')
]).pipe(take(1));

// Create quill editor
const quill = new Quill('#editor', {
  theme: 'snow',
  modules: {
    toolbar: '#toolbar'
  }
});

// Subscribe to grist data
ready.subscribe(() => {
  grist.ready();
  grist.onRecords(async function(pages) {
    // Every time pages change - update pages and folders
    const pagesStore = Alpine.store('pages');
    pagesStore.list = pages;
    const folders = toObjects(await grist.docApi.fetchTable("Folders"));
    const folderStore = Alpine.store('folders');
    folderStore.list = folders;
    if (!folderStore.selected() && folders.length) {
      folderStore.id = folders[0].id;
    }
    if (folderStore.selected()) {
      pagesStore.folderSelected(folderStore.selected());
    }
  });
});

// create events emitted from the ui
const folderClick = new Subject();
const pageClick = new Subject();
const textChanged = new Subject();
const nameChanged = new Subject();
quill.on('text-change', () => textChanged.next(null));
// Throttle the save event, to not occur more often than once every second.  
const saveEvent = ready
  .pipe(concatWith(textChanged), skip(1)) // emit after ready
  .pipe(mergeWith(nameChanged)) // listen also to name change
  .pipe(debounceTime(1000)); // buffer for 1 second

const addPage = new Subject();
const addFolder = new Subject();

let menu, folders, pages;

// create store
fromEvent(document, 'alpine:init').subscribe(() => {
  Alpine.store('menu', {
    on: true,
    toggle() {
      this.on = !this.on;
    }
  });
  folders = Alpine.store('folders', {
    list: [],
    id: 0,
    selected() {
      return this.id ? this.list.find(f => f.id === this.id) : null;
    }
  });
  Alpine.store('pages', {
    list: [],
    active: [],
    id: 0,
    current: { Name: '' },
    folderSelected(folder) {
      this.active = this.list.filter(p => p.Folder === folder.Name);
    }
  });
  menu = Alpine.store('menu');
  pages = Alpine.store('pages');
  folders = Alpine.store('folders');
})

// Handle ui events
folderClick.subscribe(id => {
  folders.id = id;
  const folder = folders.list.find(f => f.id === id);
  pages.active = pages.list.filter(p => p.Folder === folder.Name);
});

pageClick.subscribe(id => {
  const activePage = pages.active.find(p => id === id);
  pages.current = activePage;
  pages.id = id;
  if (activePage.Text) {
    quill.setContents(JSON.parse(activePage.Text));
  } else {
    quill.setContents(null);
  }
})

saveEvent.subscribe(async () => {
  if (!pages.id) return;
  const content = quill.getContents();
  await grist.docApi.applyUserActions([['UpdateRecord', 'Pages', pages.id, {
    "Text": JSON.stringify(content),
    "Name": pages.current.Name,
  }]]);
});

addFolder.subscribe(async () => {
  const lastId = folders.list[folders.list.length - 1].id;
  const name = `Folder${lastId + 1}`;
  await grist.docApi.applyUserActions([['AddRecord', 'Folders', null, {
    "Name": name,
  }]]);
  const list = toObjects(await grist.docApi.fetchTable("Folders"));
  folders.list = list;
});

addPage.subscribe(async () => {
  const lastId = pages.list.length ? pages.list[pages.list.length - 1].id : '0';
  const name = `Untitled${lastId + 1}`;
  await grist.docApi.applyUserActions([['AddRecord', 'Pages', null, {
    "Name": name,
    "Folder": folders.id
  }]]);
});

function toObjects(data) {
  const keys = Object.keys(data).filter(k => Array.isArray(data[k]));
  if (!keys.length) return [];
  return data[keys[0]].map((v, i) => {
    const obj = {};
    keys.forEach(k => obj[k] = data[k][i]);
    return obj;
  })
}