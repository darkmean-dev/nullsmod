
let schema = {};                    
let GROUP_KEYS = [];                
let PARAMS_BY_GROUP = {};           
let OBJECT_EXAMPLES_BY_GROUP = {};  

let model = {                       
  "@title": "",
  "@description": "",
  "@author": "",
  "@version": "",
  
};
let files = [];                     
let modIconFile = null;


const KNOWN_FOLDERS = ["movie", "font", "json", "music", "sc", "sc3d", "sfx", "shader"];


const metaTitle = document.getElementById("meta-title");
const metaDesc = document.getElementById("meta-description");
const metaAuthor = document.getElementById("meta-author");
const metaVersion = document.getElementById("meta-version");

const iconInput = document.getElementById("mod-icon");
const iconPreview = document.getElementById("icon-preview");

const folderSelect = document.getElementById("folder-select");
const fileInput = document.getElementById("file-input");
const filesList = document.getElementById("files-list");

const addObjGroupSelect = document.getElementById("add-object-group");
const addObjBtn = document.getElementById("add-object-btn");
const groupsRoot = document.getElementById("groups-root");

const jsonPreview = document.getElementById("json-preview");

const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importZipInput = document.getElementById("import-zip");

const applyBtn = document.getElementById("apply-json");
const formatBtn = document.getElementById("format-json");
const codeError = document.getElementById("code-error");

window.addEventListener('beforeunload', (event) => {
    event.preventDefault(); 
});


let cm = CodeMirror(document.getElementById("editor"), {
  value: "{\n  \n}",
  mode: {name:"javascript", json:true},
  theme: "material-darker",
  lineNumbers: false,
  tabSize: 2,
  indentUnit: 2,
  lineWrapping: true,
});


const debounce = (fn, ms=400)=>{
  let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
};


cm.on("change", debounce(()=>{
  const text = cm.getValue();
  try{
    JSON.parse(text);
    codeError.classList.add("d-none");
    
  }catch(e){
    codeError.textContent = "Ошибка JSON: " + e.message;
    codeError.classList.remove("d-none");
  }
}, 500));


(async function loadSchema(){
  try {
    const res = await fetch("https://raw.githubusercontent.com/darkmean-dev/nullsmods-schema/main/schema.json")
    const data = await res.json();
    const props = data?.properties || {};
    schema = props;

    
    GROUP_KEYS = Object.keys(props).filter(k=>!k.startsWith("@"));

    
    GROUP_KEYS.forEach(g=>{
      const params = Object.keys(props[g]?.additionalProperties?.properties || {});
      PARAMS_BY_GROUP[g] = params;
      const examples = props[g]?.propertyNames?.examples || [];
      OBJECT_EXAMPLES_BY_GROUP[g] = ["*", ...examples]; 
    });

    
    populateFolderSelect();
    populateAddObjectGroup();
    renderAll();
  } catch (error) {
    console.error("Failed to load schema:", error);
    alert("Не удалось загрузить схему модов. Некоторые функции могут не работать.");
  }
})();


[metaTitle, metaDesc, metaAuthor, metaVersion].forEach(inp=>{
  inp.addEventListener("input", ()=>{
    model["@title"]=metaTitle.value || undefined;
    model["@description"]=metaDesc.value || undefined;
    model["@author"]=metaAuthor.value || undefined;
    model["@version"]=metaVersion.value || undefined;
    cleanupMeta();
    repaint();
  });
});
function cleanupMeta(){
  ["@title","@description","@author","@version"].forEach(k=>{
    if(!model[k]) delete model[k];
  });
}


iconInput.addEventListener("change", e=>{
  const f = e.target.files[0];
  if(!f) return;
  const img = new Image();
  img.src = URL.createObjectURL(f);
  img.onload = ()=>{
    if(img.width>600 || img.height>600){
      alert("Иконка должна быть ≤600×600");
      iconInput.value = "";
      iconPreview.classList.add("d-none");
      iconPreview.removeAttribute("src");
      modIconFile = null;
    }else{
      modIconFile = f;
      iconPreview.src = img.src;
      iconPreview.classList.remove("d-none");
    }
  };
});


function populateFolderSelect(){
  folderSelect.innerHTML = "";
  KNOWN_FOLDERS.forEach(f=>{
    const opt = document.createElement("option");
    opt.value = f; opt.textContent = f;
    folderSelect.appendChild(opt);
  });
}
fileInput.addEventListener("change", e=>{
  const folder = folderSelect.value || KNOWN_FOLDERS[0];
  [...e.target.files].forEach(f=>{
    
    if (!files.some(item => item.folder === folder && item.file.name === f.name)) {
        files.push({file:f, folder});
    }
  });
  e.target.value="";
  renderFiles();
});
function renderFiles(){
  filesList.innerHTML="";
  if (files.length === 0) {
    const li = document.createElement("li");
    li.className = "list-group-item text-muted-2";
    li.textContent = "Пока нет файлов...";
    filesList.appendChild(li);
    return;
  }
  files.forEach((item, idx)=>{
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.textContent = `${item.folder}/${item.file.name}`;
    const del = document.createElement("button");
    del.className = "btn btn-sm btn-danger";
    del.textContent = "Удалить";
    del.addEventListener("click", ()=>{
      files.splice(idx,1);
      renderFiles();
    });
    li.appendChild(del);
    filesList.appendChild(li);
  });
}


function populateAddObjectGroup(){
  addObjGroupSelect.innerHTML="";
  GROUP_KEYS.forEach(g=>{
    const opt = document.createElement("option");
    opt.value=g; opt.textContent=g;
    addObjGroupSelect.appendChild(opt);
  });
}

function addObject(group, objName = "*") {
    if(!group) return;
    if(!model[group]) model[group] = {};
    if(model[group][objName]) {
        
        
    } else {
       model[group][objName] = {};
    }
    
    
    if (Object.keys(model[group][objName]).length === 0) {
        const firstParam = PARAMS_BY_GROUP[group]?.[0];
        if(firstParam) {
            const paramSchema = schema[group]?.additionalProperties?.properties?.[firstParam];
            let defaultValue = ""; 
            if (paramSchema?.type === 'boolean') {
                defaultValue = false; 
            } else if (paramSchema?.default !== undefined) {
                defaultValue = paramSchema.default;
            }
            model[group][objName][firstParam] = defaultValue;
        }
    }
    repaint();
}


addObjBtn.addEventListener("click", ()=>{
  const group = addObjGroupSelect.value || GROUP_KEYS[0];
  addObject(group);
});


function renderGroups(){
  groupsRoot.innerHTML="";
  
  const hasContent = GROUP_KEYS.some(g => model[g] && Object.keys(model[g]).length > 0);

  if (!hasContent) {
      const emptyState = document.createElement('div');
      emptyState.className = 'text-center p-5 text-muted-2';
      emptyState.innerHTML = `
          <h5 class="fw-normal">Объектов пока нет</h5>
          <p class="mb-0">Используйте кнопку "Добавить объект", чтобы начать.</p>
      `;
      groupsRoot.appendChild(emptyState);
      return;
  }

  GROUP_KEYS.forEach(group=>{
    const groupObj = model[group] || {};
    
    if(Object.keys(groupObj).length === 0) return;

    
    const gCard = document.createElement("div");
    gCard.className = "group-card";

    
    const header = document.createElement("div");
    header.className = "group-header";
    const title = document.createElement("div");
    title.className = "group-title";
    title.textContent = group;
    const addForGroup = document.createElement("button");
    addForGroup.className = "btn btn-sm btn-outline-light";
    addForGroup.textContent = "Добавить объект";
    addForGroup.addEventListener("click", () => addObject(group));
    header.appendChild(title);
    header.appendChild(addForGroup);

    
    const grid = document.createElement("div");
    grid.className = "objects-grid";

    Object.keys(groupObj).forEach(objectName=>{
      const params = groupObj[objectName] || {};

      const oCard = document.createElement("div");
      oCard.className = "object-card";
      const head = document.createElement("div");
      head.className = "object-head";
      const left = document.createElement("div");
      left.style.display = "flex"; left.style.alignItems = "center"; left.style.gap = "6px";
      const objSelect = document.createElement("select");
      objSelect.className = "form-select form-select-dark"; objSelect.style.maxWidth = "260px";
      const options = [...new Set([...OBJECT_EXAMPLES_BY_GROUP[group], objectName])]; 
      options.forEach(name=>{
        const opt = document.createElement("option");
        opt.value = name; opt.textContent = name;
        if(name===objectName) opt.selected = true;
        objSelect.appendChild(opt);
      });
      objSelect.addEventListener("change", (e)=>{
        const newName = e.target.value;
        if(newName===objectName) return;
        model[group][newName] = model[group][objectName] || {};
        delete model[group][objectName];
        repaint();
      });
      const objTitle = document.createElement("div");
      objTitle.className = "object-title";
      objTitle.textContent = "Объект";
      left.appendChild(objTitle);
      left.appendChild(objSelect);
      const right = document.createElement("div");
      right.className = "object-actions";
      const delObj = document.createElement("button");
      delObj.className = "btn btn-sm btn-danger"; delObj.textContent = "Удалить";
      delObj.addEventListener("click", ()=>{
        
        if(confirm(`Вы уверены, что хотите удалить объект "${objectName}"?`)){
            delete model[group][objectName];
            if(Object.keys(model[group]).length===0) delete model[group];
            repaint();
        }
      });
      const addParam = document.createElement("button");
      addParam.className = "btn btn-sm btn-outline-light"; addParam.textContent = "Параметр";
      addParam.addEventListener("click", ()=>{
        const list = PARAMS_BY_GROUP[group] || [];
        const free = list.find(p=> model[group][objectName][p]===undefined );
        if(!free){
            alert("Все доступные параметры для этой группы уже добавлены.");
            return;
        };
        model[group][objectName][free] = ""; 
        repaint();
      });
      right.appendChild(addParam);
      right.appendChild(delObj);
      head.appendChild(left);
      head.appendChild(right);

      const pList = document.createElement("div");
      pList.className = "param-list";
      const allowedParams = new Set(PARAMS_BY_GROUP[group] || []);
      Object.keys(params).forEach(paramName=>{
        if(!allowedParams.has(paramName)) return;
        const pill = document.createElement("div");
        pill.className = "param-pill";
        const nameSelect = document.createElement("select");
        nameSelect.className = "form-select form-select-sm"; nameSelect.style.width = "160px";
        const available = [...PARAMS_BY_GROUP[group]];
        available.forEach(p=>{
          const opt = document.createElement("option");
          opt.value = p; opt.textContent = p;
          if(p===paramName) opt.selected = true;
          
          if (params[p] !== undefined && p !== paramName) {
              opt.disabled = true;
          }
          nameSelect.appendChild(opt);
        });
        nameSelect.addEventListener("change", (e)=>{
          const newParam = e.target.value;
          if(newParam===paramName) return;
          model[group][objectName][newParam] = model[group][objectName][paramName];
          delete model[group][objectName][paramName];
          repaint();
        });

        
        const paramSchema = schema[group]?.additionalProperties?.properties?.[paramName];
        const valueWrap = document.createElement("div");
        valueWrap.className = "param-value";
        let inputElement;

        if (paramSchema?.enum) {
            inputElement = document.createElement("select");
            inputElement.className = "form-select form-select-dark";
            paramSchema.enum.forEach(val => {
                const opt = document.createElement("option");
                opt.value = val; opt.textContent = val;
                if (String(val) === String(params[paramName])) opt.selected = true;
                inputElement.appendChild(opt);
            });
            inputElement.addEventListener("change", () => {
                model[group][objectName][paramName] = inputElement.value;
                repaintPreviewOnly();
            });
        } else if (paramSchema?.type === 'boolean') {
            valueWrap.style.minWidth = 'auto'; 
            inputElement = document.createElement("input");
            inputElement.type = "checkbox";
            inputElement.className = "form-check-input";
            inputElement.checked = !!params[paramName];
            inputElement.addEventListener("change", () => {
                model[group][objectName][paramName] = inputElement.checked;
                repaintPreviewOnly();
            });
        } else {
            inputElement = document.createElement("input");
            inputElement.type = "text";
            inputElement.value = params[paramName] ?? "";
            inputElement.placeholder = "значение…";
            inputElement.addEventListener("input", debounce(() => {
                model[group][objectName][paramName] = inputElement.value;
                repaintPreviewOnly();
            }, 300));
        }

        valueWrap.appendChild(inputElement);
        
        const remove = document.createElement("button");
        remove.className = "param-remove"; remove.textContent = "×"; remove.title = "Удалить параметр";
        remove.addEventListener("click", ()=>{
           if (confirm(`Вы уверены, что хотите удалить параметр "${paramName}"?`)) {
                delete model[group][objectName][paramName];
                if(Object.keys(model[group][objectName]).length===0) delete model[group][objectName];
                if(Object.keys(model[group]).length===0) delete model[group];
                repaint();
           }
        });

        pill.appendChild(nameSelect);
        pill.appendChild(valueWrap);
        pill.appendChild(remove);
        pList.appendChild(pill);
      });

      oCard.appendChild(head);
      oCard.appendChild(pList);
      grid.appendChild(oCard);
    });

    gCard.appendChild(header);
    gCard.appendChild(grid);
    groupsRoot.appendChild(gCard);
  });
}


function buildCleanJSON(){
  const out = {};
  ["@title","@description","@author","@version"].forEach(k=>{
    if(model[k]) out[k]=model[k];
  });
  GROUP_KEYS.forEach(group=>{
    const g = model[group];
    if(!g) return;
    const groupOut = {};
    Object.keys(g).forEach(objName=>{
      const objParams = g[objName];
      const objOut = {};
      Object.keys(objParams).forEach(p=>{
        const v = objParams[p];
        
        if(v !== undefined && v !== null){
          objOut[p]=v;
        }
      });
      if(Object.keys(objOut).length>0){
        groupOut[objName] = objOut;
      }
    });
    if(Object.keys(groupOut).length>0){
      out[group]=groupOut;
    }
  });
  return out;
}

function repaintPreviewOnly(){
  const json = buildCleanJSON();
  const pretty = JSON.stringify(json, null, 2);
  jsonPreview.textContent = pretty;
}

function repaint(){
  renderGroups();
  repaintPreviewOnly();
  const pretty = JSON.stringify(buildCleanJSON(), null, 2);
  if(cm.getValue() !== pretty){
    const cursor = cm.getCursor();
    cm.setValue(pretty);
    cm.setCursor(cursor);
  }
}

function renderAll(){
  metaTitle.value = model["@title"] || "";
  metaDesc.value = model["@description"] || "";
  metaAuthor.value = model["@author"] || "";
  metaVersion.value = model["@version"] || "";
  renderFiles();
  repaint();
}


formatBtn.addEventListener("click", ()=>{
  try{
    const obj = JSON.parse(cm.getValue());
    cm.setValue(JSON.stringify(obj, null, 2));
    codeError.classList.add("d-none");
  }catch(e){
    codeError.textContent = "Ошибка JSON: " + e.message;
    codeError.classList.remove("d-none");
  }
});

applyBtn.addEventListener("click", ()=>{
  try{
    const obj = JSON.parse(cm.getValue());
    codeError.classList.add("d-none");
    const nextModel = {};
    ["@title","@description","@author","@version"].forEach(k=>{
      if(typeof obj[k]==="string") nextModel[k]=obj[k];
    });
    GROUP_KEYS.forEach(group=>{
      if(obj[group] && typeof obj[group]==="object"){
        const gIn = obj[group];
        const gOut = {};
        Object.keys(gIn).forEach(objectName=>{
          const paramsIn = gIn[objectName];
          if(typeof paramsIn!=="object") return;
          const objOut = {};
          (PARAMS_BY_GROUP[group]||[]).forEach(p=>{
            if(p in paramsIn){
              
              objOut[p] = paramsIn[p];
            }
          });
          if(Object.keys(objOut).length>0){
            gOut[objectName]=objOut;
          }
        });
        if(Object.keys(gOut).length>0){
          nextModel[group]=gOut;
        }
      }
    });
    model = nextModel;
    renderAll();
  }catch(e){
    codeError.textContent = "Ошибка JSON: " + e.message;
    codeError.classList.remove("d-none");
  }
});


exportBtn.addEventListener("click", async ()=>{
  const zip = new JSZip();
  const cleanJson = buildCleanJSON();
  if(Object.keys(cleanJson).length === 0 && files.length === 0 && !modIconFile) {
      alert("Нечего экспортировать. Добавьте мета-информацию, объекты или файлы.");
      return;
  }
  zip.file("content.json", JSON.stringify(cleanJson, null, 2));
  if(modIconFile){
    zip.file("icon.png", modIconFile);
  }
  files.forEach(item=>{
    const path = `${item.folder}/${item.file.name}`;
    zip.file(path, item.file);
  });
  const blob = await zip.generateAsync({type:"blob"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const modName = (model['@title'] || 'mod').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  a.download = `${modName}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
});


importBtn.addEventListener("click", ()=>importZipInput.click());
importZipInput.addEventListener("change", async (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const zip = await JSZip.loadAsync(f);
  
  model = {};
  files = [];
  modIconFile = null;
  iconPreview.classList.add("d-none");
  iconPreview.removeAttribute("src");

  if(zip.file("content.json")){
    try{
      const text = await zip.file("content.json").async("text");
      const obj = JSON.parse(text);
      cm.setValue(JSON.stringify(obj, null, 2));
      applyBtn.click(); 
    }catch(err){
      alert("Ошибка чтения content.json: " + err.message);
    }
  } else {
    
    renderAll();
  }
  if(zip.file("icon.png")){
    const blob = await zip.file("icon.png").async("blob");
    modIconFile = new File([blob], "icon.png", {type:"image/png"});
    const url = URL.createObjectURL(modIconFile);
    iconPreview.src = url;
    iconPreview.classList.remove("d-none");
  }
  const entries = Object.keys(zip.files);
  for(const path of entries){
    if(path.endsWith("/") || path==="content.json" || path==="icon.png") continue;
    const top = path.split("/")[0];
    if(!KNOWN_FOLDERS.includes(top)) continue;
    const blob = await zip.file(path).async("blob");
    const name = path.substring(path.indexOf('/') + 1);
    if(name) { 
        files.push({file: new File([blob], name), folder: top});
    }
  }
  renderFiles();
  e.target.value = "";
});