function memory(name) {
  const key = `___${name}`;
  return function (arg) {
    if (arg === undefined) {
      const value = sessionStorage.getItem(key);
      if (value == null) {
        return value;
      }
      return JSON.parse(value);
    } else {
      sessionStorage.setItem(key, JSON.stringify(arg));
    }
  };
}

const jsValue = memory('js');
const htmlValue = memory('html');

const HTML = `
<html lang="en">
<head>
  <script src="https://docs.getgrist.com/grist-plugin-api.js"></script>
</head>
<body>

</body>
</html>
`.trim();

const JS = `
grist.ready({ requiredAccess: 'none' });
grist.onRecords(table => {

});
grist.onRecord(record => {

});
`.trim();

let htmlModel;
let jsModel;

function reset() {
  htmlModel.setValue(HTML);
  jsModel.setValue(JS);
}

// Builds code editor replacing all <script type="code" /> elements with a monaco instance.
function buildEditor() {
  htmlModel = monaco.editor.createModel(htmlValue() ?? HTML, 'html');
  jsModel = monaco.editor.createModel(jsValue() ?? JS, 'javascript');

  jsModel.onDidChangeContent(() => {
    jsValue(jsModel.getValue());
  });
  htmlModel.onDidChangeContent(() => {
    htmlValue(htmlModel.getValue());
  });
  // Replace script tag with a div that will be used as a container for monaco editor.
  const container = document.getElementById('container');
  // Create JS monaco model - like a tab in the IDE.
  // Create IDE. Options here are only for styling and making editor look like a
  // code snippet.
  const editor = monaco.editor.create(container, {
    model: jsModel,
    automaticLayout: true,
    fontSize: '13px',
    wordWrap: 'on',
    minimap: {
      enabled: false,
    },
    lineNumbers: 'off',
    glyphMargin: false,
    folding: false,
  });
  // Set tabSize - this can be done only after editor is created.
  editor.getModel().updateOptions({tabSize: 2});
  // Disable scrolling past the last line - we will expand editor if necessary.
  editor.updateOptions({scrollBeyondLastLine: false});
  window.editor = editor;
}
const page_widget = document.getElementById('page_widget');
const page_editor = document.getElementById('page_editor');
const btnPreview = document.getElementById('btnPreview');
const btnEditor = document.getElementById('btnEditor');
const btnTabJs = document.getElementById('tab_js');
const btnTabHtml = document.getElementById('tab_html');
const btnReset = document.getElementById('btnReset');
const btnInstall = document.getElementById('btnInstall');
const bar = document.getElementById('_bar');
let wFrame = null;

function purge(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

let lastListener;
function createFrame() {
  // remove all data from page_widget
  purge(page_widget);
  wFrame = document.createElement('iframe');
  page_widget.appendChild(wFrame);
  const widgetWindow = wFrame.contentWindow;
  // Rewire messages between this widget, and the preview
  if (lastListener) window.removeEventListener('message', lastListener);
  lastListener = e => {
    if (e.source === widgetWindow) {
      window.parent.postMessage(e.data, '*');
    } else if (e.source === window.parent) {
      widgetWindow.postMessage(e.data, '*');
    }
  }
  window.addEventListener('message', lastListener);
}

function init() {
  if (init.invoked) return;
  init.invoked = true;
  // Import definitions from api_deps.js
  monaco.languages.typescript.javascriptDefaults.addExtraLib(definition, 'plugin.d.ts');
  // Declare global grist namespace.
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    `
    import * as Grist from "grist"
    declare global {
      interface Window {
        var grist: typeof Grist;
      }
    }
    export {}
    `,
    'main.d.ts'
  );
}

function changeModel(lang) {
  editor.setModel(lang == 'js' ? jsModel : htmlModel);
  btnTabHtml.style.background = 'white';
  btnTabJs.style.background = 'white';
  (lang == 'js' ? btnTabJs : btnTabHtml).style.background = 'lightgreen';
}
function showPreview(code, html) {
  code = code ?? jsModel.getValue();
  html = html ?? htmlModel.getValue();
  createFrame();
  const content = wFrame.contentWindow;
  content.document.open();
  content.document.write(html);
  if (code.trim()) {
    if (!html.includes('grist-plugin-api.js')) {
      content.document.write(
        `<script src="https://docs.getgrist.com/grist-plugin-api.js"></` + `script>`
      );
    }
    content.document.write(`<script>${code}</` + `script>`);
  }
  content.document.close();
  page_widget.style.display = 'block';
  page_editor.style.display = 'none';

  [...document.getElementsByClassName('_tab')].forEach(e => (e.style.display = 'none'));
  [...document.getElementsByClassName('_button')].forEach(
    e => (e.style.display = 'none')
  );
  btnInstall.style.display = 'inline-block';
  btnEditor.style.display = 'inline-block';
}

function showEditor() {
  page_widget.style.display = 'none';
  page_editor.style.display = 'block';

  [...document.getElementsByClassName('_tab')].forEach(
    e => (e.style.display = 'inline-block')
  );
  [...document.getElementsByClassName('_button')].forEach(
    e => (e.style.display = 'none')
  );
  btnPreview.style.display = 'inline-block';
}

// Create cancellable onOptions version
const onOptions = function (clb) {
  let listen = true;
  grist.onOptions((...data) => {
    if (listen) {
      clb(...data);
    }
  });
  return () => void (listen = false);
};

let installed = false;
let isEditor = false;
onOptions(options => {
  if (options?._installed && !installed) {
    installed = true;
    page_editor.style.display = 'none';
    bar.style.display = 'none';
    jsValue(options._js);
    htmlValue(options._html);
    showPreview(options._js, options._html);
    onOptions(options => {
      if (!options) {
        window.location.reload();
      }
    });
  } else if (!installed && !isEditor) {
    isEditor = true;
    init();
    bar.style.display = 'flex';
    showEditor();
    buildEditor();
  }
});

function install() {
  grist.setOptions({
    _installed: true,
    _js: jsModel.getValue(),
    _html: htmlModel.getValue(),
  });
  window.location.reload();
}

grist.ready();
