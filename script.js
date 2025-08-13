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
const removeIconButton = document.getElementById("remove-icon-btn");

const folderSelect = document.getElementById("folder-select");
const fileInput = document.getElementById("file-input");
const filesList = document.getElementById("files-list");

const addObjGroupSelect = document.getElementById("add-object-group");
const addObjBtn = document.getElementById("add-object-btn");
const groupsRoot = document.getElementById("groups-root");

const jsonPreview = document.getElementById("json-preview");
const metaPreview = document.getElementById("meta-preview");
const previewTitle = document.getElementById("preview-title");
const previewDescription = document.getElementById("preview-description");
const previewAuthor = document.getElementById("preview-author");

const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importZipInput = document.getElementById("import-zip");

const applyBtn = document.getElementById("apply-json");
const formatBtn = document.getElementById("format-json");
const codeError = document.getElementById("code-error");


// Monaco Editor Setup
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
    updateMetaPreview();
    repaint();
  });
});

function cleanupMeta(){
  ["@title","@description","@author","@version"].forEach(k=>{
    if(!model[k]) delete model[k];
  });
}

function updateMetaPreview() {
  if (model["@title"] || model["@description"] || model["@author"]) {
    metaPreview.classList.remove("d-none");
    previewTitle.innerHTML = model["@title"] || "Название мода";
    previewDescription.innerHTML = (model["@description"] || "Описание мода").replace(/\n/g, '<br>');
    previewAuthor.innerHTML = model["@author"] ? `Автор: ${model["@author"]}` : "Автор: Не указан";
  } else {
    metaPreview.classList.add("d-none");
  }
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
      removeIconButton.classList.remove("d-none");
    }
  };
});

removeIconButton.addEventListener("click", () => {
    iconInput.value = "";
    iconPreview.classList.add("d-none");
    iconPreview.removeAttribute("src");
    modIconFile = null;
    removeIconButton.classList.add("d-none");
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
            } else if (paramSchema?.type === "array") {
                 defaultValue = [""];
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

      
      const objSelectContainer = document.createElement("div");
      objSelectContainer.className = "object-head";
      const objSelect = document.createElement("select");
      objSelect.className = "form-select form-select-dark";
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
      objSelectContainer.appendChild(objSelect);


      const actionsContainer = document.createElement("div");
      actionsContainer.className = "object-actions";
      const addParam = document.createElement("button");
      addParam.className = "btn btn-sm btn-outline-light";
      addParam.textContent = "Параметр";
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
      const delObj = document.createElement("button");
      delObj.className = "btn btn-sm btn-danger";
      delObj.textContent = "Удалить";
      delObj.addEventListener("click", ()=>{
        if(confirm(`Вы уверены, что хотите удалить объект "${objectName}"?`)){
          delete model[group][objectName];
          if(Object.keys(model[group]).length===0) delete model[group];
          repaint();
        }
      });
      actionsContainer.appendChild(addParam);
      actionsContainer.appendChild(delObj);
      

      const pList = document.createElement("div");
      pList.className = "param-list";
      const allowedParams = new Set(PARAMS_BY_GROUP[group] || []);
      Object.keys(params).forEach(paramName=>{
        if(!allowedParams.has(paramName)) return;
        
        const paramSchema = schema[group]?.additionalProperties?.properties?.[paramName];
        const isMultiple = paramSchema?.type === "array";

        const pill = document.createElement("div");
        pill.className = "param-pill";

        const paramNameSpan = document.createElement("span");
        paramNameSpan.className = "param-name";
        paramNameSpan.textContent = paramName;
        
        const valueContainer = document.createElement("div");
        valueContainer.className = `param-value ${isMultiple ? 'multiple' : ''}`;


        if (isMultiple) {
             const values = params[paramName] || [""];
             values.forEach((value, valueIndex) => {
                 const valueItem = document.createElement("div");
                 valueItem.className = "multiple-value-item";
                 const input = document.createElement("input");
                 input.type = "text";
                 input.value = value;
                 input.addEventListener("input", (e) => {
                     model[group][objectName][paramName][valueIndex] = e.target.value;
                     repaint();
                 });

                 const removeValueBtn = document.createElement("button");
                 removeValueBtn.className = "remove-value-btn";
                 removeValueBtn.textContent = "–";
                 removeValueBtn.addEventListener("click", () => {
                     model[group][objectName][paramName].splice(valueIndex, 1);
                     if (model[group][objectName][paramName].length === 0) {
                         delete model[group][objectName][paramName];
                     }
                     repaint();
                 });

                 valueItem.appendChild(input);
                 valueItem.appendChild(removeValueBtn);
                 valueContainer.appendChild(valueItem);
             });

             const addValueBtn = document.createElement("button");
             addValueBtn.className = "add-value-btn";
             addValueBtn.textContent = "+";
             addValueBtn.addEventListener("click", () => {
                 if (model[group][objectName][paramName] === undefined) {
                    model[group][objectName][paramName] = [""];
                 } else {
                    model[group][objectName][paramName].push("");
                 }
                 repaint();
             });
             valueContainer.appendChild(addValueBtn);

        } else {
            const input = document.createElement("input");
            input.type = paramSchema?.type === 'number' ? 'number' : 'text';
            if (paramSchema?.type === 'boolean') {
                input.type = "checkbox";
                input.checked = params[paramName];
                input.addEventListener("change", (e) => {
                    model[group][objectName][paramName] = e.target.checked;
                    repaint();
                });
            } else {
                input.value = params[paramName];
            const debouncedRepaint = debounce(() => {
                repaint();
            }, 2000);

            input.addEventListener("input", (e) => {
                let value = e.target.value;
                if (input.type === 'number') {
                    value = parseFloat(value) || 0;
                }
                model[group][objectName][paramName] = value;
                debouncedRepaint();
            });


            }
            valueContainer.appendChild(input);
        }

        pill.appendChild(paramNameSpan);
        pill.appendChild(valueContainer);
        
        const delParam = document.createElement("button");
        delParam.className = "remove-value-btn-param";
        delParam.textContent = "×";
        delParam.addEventListener("click", () => {
            delete model[group][objectName][paramName];
            repaint();
        });
        pill.appendChild(delParam);
        
        pList.appendChild(pill);
      });
      
      oCard.appendChild(objSelectContainer);
      oCard.appendChild(actionsContainer);
      oCard.appendChild(pList);
      grid.appendChild(oCard);
    });
    gCard.appendChild(header);
    gCard.appendChild(grid);
    groupsRoot.appendChild(gCard);
  });
}


function repaint(){
  // синхронизация полей
  metaTitle.value = model["@title"] || "";
  metaDesc.value = model["@description"] || "";
  metaAuthor.value = model["@author"] || "";
  metaVersion.value = model["@version"] || "";

  updateMetaPreview();
  renderFiles();
  renderGroups();

  // создаём копию модели для вывода
  const outputModel = JSON.parse(JSON.stringify(model));

  // заменяем переносы на <br> в @description
  if(outputModel["@description"]){
    outputModel["@description"] = outputModel["@description"].replace(/\n/g, "<br>");
  }

  const text = JSON.stringify(outputModel, null, 2);
  jsonPreview.textContent = text;
  cm.setValue(text); // чтобы код тоже синхронизировался
}




function renderAll(){
  repaint();
  
  const text = JSON.stringify(model, null, 2);
  cm.setValue(text);
  
  
  if(modIconFile){
    iconPreview.src = URL.createObjectURL(modIconFile);
    iconPreview.classList.remove("d-none");
    removeIconButton.classList.remove("d-none");
  }
}


applyBtn.addEventListener("click", ()=>{
  const text = cm.getValue();
  try{
    const obj = JSON.parse(text);
    model = obj;
    codeError.classList.add("d-none");
    renderAll();
    
    
  }catch(e){
    codeError.textContent = "Ошибка JSON: " + e.message;
    codeError.classList.remove("d-none");
  }
});

formatBtn.addEventListener("click", ()=>{
  const text = cm.getValue();
  try{
    const obj = JSON.parse(text);
    const formatted = JSON.stringify(obj, null, 2);
    cm.setValue(formatted);
    codeError.classList.add("d-none");
  }catch(e){
    codeError.textContent = "Ошибка JSON: " + e.message;
    codeError.classList.remove("d-none");
  }
});


exportBtn.addEventListener("click", async ()=>{
  const zip = new JSZip();
  const text = JSON.stringify(model, null, 2);
  zip.file("content.json", text);
  if(modIconFile){
    zip.file("icon.png", modIconFile);
  }
  files.forEach(item=>{
    zip.file(`${item.folder}/${item.file.name}`, item.file);
  });
  const modName = model["@title"] || "unnamed_mod";
  const content = await zip.generateAsync({type:"blob"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(content);
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
  removeIconButton.classList.add("d-none");

  if(zip.file("content.json")){
    try{
      const text = await zip.file("content.json").async("text");
      const obj = JSON.parse(text);
      model = obj;
      
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
    removeIconButton.classList.remove("d-none");
  }
  
  const entries = Object.keys(zip.files);
  for(const path of entries){
    if(path.endsWith("/") || path==="content.json" || path==="icon.png") continue;
    const parts = path.split("/");
    const folder = parts[0];
    const fileName = parts.slice(1).join("/");
    const blob = await zip.file(path).async("blob");
    const file = new File([blob], fileName);
    
    files.push({file, folder});
  }
  
  renderAll();
  e.target.value = '';
});