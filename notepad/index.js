const {Subject, interval, fromEvent, combineLatest} = rxjs;
const {debounceTime, skip, take, concatWith, mergeWith} = rxjs.operators;

// create ready event from dom and alpline
const ready = combineLatest([fromEvent(window, 'DOMContentLoaded')]).pipe(take(1));

var toolbarOptions = [
  ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
  ['blockquote', 'code-block'],

  [{ 'header': 1 }, { 'header': 2 }],               // custom button values
  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
  [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
  [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
  [{ 'direction': 'rtl' }],                         // text direction

  [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

  [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
  [{ 'font': [] }],
  [{ 'align': [] }],

  ['clean']                                         // remove formatting button
];

// Create quill editor
const quill = new Quill('#editor', {
  theme: 'snow',
  modules: {
    toolbar: toolbarOptions,
  },
});

let column;
let id;
let lastContent;
let lastSave = Promise.resolve();
let tableId;

// Subscribe to grist data
ready.subscribe(() => {
  grist.ready({requiredAccess: 'full', columns: [{name: 'Content', type: 'Text'}]});
  grist.on('message', data => {
    if (data.tableId) {
      tableId = data.tableId;
    }
  });
  grist.onRecord(function (record, mappings) {
    if (id !== record.id || mappings?.Content != column) {
      id = record.id;
      column = mappings?.Content;
      const mapped = grist.mapColumnNames(record);
      if (!mapped) {
        console.log('Please map columns');
      } else if (lastContent != mapped.Content) {
        quill.setContents(mapped.Content ? JSON.parse(mapped.Content) : null);
        lastContent = mapped.Content;
      }
    }
  });
});

// create events emitted from the ui
const textChanged = new Subject();
quill.on('text-change', () => textChanged.next(null));
// Throttle the save event, to not occur more often than once every second.
const saveEvent = ready
  .pipe(concatWith(textChanged), skip(1)) // emit after ready
  .pipe(debounceTime(1)); // little debounce

saveEvent.subscribe(async () => {
  const content = quill.getContents();
  if (column) {
    lastContent = JSON.stringify(content);
    try {
      if (prom) {
        await prom;
      }
    } catch (err) {
      console.error(err);
    }
    prom = grist.docApi.applyUserActions([
      [
        'UpdateRecord',
        tableId,
        id,
        {
          [column]: lastContent,
        },
      ],
    ]);
  }
});
