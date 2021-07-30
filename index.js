const toolbarOptions = [
  ['hamburger', 'bold', 'italic', 'underline'],        // toggled buttons

  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent

  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

  [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
  [{ 'font': [] }],
  [{ 'align': [] }],

  ['clean'],                                         // remove formatting button
];

const quill = new Quill('#editor', {
  theme: 'snow',
  modules: {
    toolbar: '#toolbar'
  }
});

function ready(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

// grist.docApi.applyUserActions([ ['UpdateRecord', tableId, rowId, {
//           [colId]: data
//         }]])

ready(() => {
  grist.ready();
  grist.onRecords(function(records) {
    const store = Alpine.store('pages');
    store.list = records;
    console.log("Records", records);
  });
  grist.onRecord(function(record) {
    console.log("On record", record);
  })
  grist.on('message', async (msg) => {
    if (msg.tableId === 'Pages') {
      const folders = toObjects(await grist.docApi.fetchTable("Folders"));
      const store = Alpine.store('folders');
      store.list = folders;
      console.log("Folders", folders);
    }
  })
});

document.addEventListener('alpine:init', () => {
  Alpine.store('menu', {
    on: true,
    page : 0,
    folder: 0,
    pages : [],
    toggle() {
      this.on = !this.on
    },
    showFolder(id) {
      this.folder = id;
      const folder = Alpine.store('folders').list.find(x => x.id === id);
      this.pages = Alpine.store('pages').list.filter(x=> x.Folder === folder.Name);
    }
  });
  Alpine.store('page', {
    id: 0,
    text: '',
    save() {

    }
  });
  Alpine.store('folders', {
    list: [],
    add() {
      this.on = !this.on
    },
    remove() {

    }
  });
  Alpine.store('pages', {
    list: [],
    add() {
      this.on = !this.on
    },
    remove() {

    },
    rename() {

    },
  });
})

function toObjects(data) {
  const keys = Object.keys(data).filter(k => Array.isArray(data[k]));
  if (!keys.length) return [];
  return data[keys[0]].map((v, i) => {
    const obj = {};
    keys.forEach(k => obj[k] = data[k][i]);
    return obj;
  })
}