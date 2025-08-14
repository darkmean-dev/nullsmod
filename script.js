let schema = {};
let GROUP_KEYS = [];
let PARAMS_BY_GROUP = {};
let OBJECT_EXAMPLES_BY_GROUP = {};
let model = {
    "@title": {},
    "@description": {},
    "@author": "",
    "@version": "",
};
let files = [];
let modIconFile = null;
let currentLanguage = "ru";
const KNOWN_LANGUAGES = ["ru", "en", "cn", "es", "pt", "tr", "fr"];

const KNOWN_FOLDERS = ["movie", "font", "json", "music", "sc", "sc3d", "sfx", "shader"];

const metaTitle = document.getElementById("meta-title");
const metaDesc = document.getElementById("meta-description");
const metaAuthor = document.getElementById("meta-author");
const metaVersion = document.getElementById("meta-version");
const languageSelect = document.getElementById("language-select");

const iconInput = document.getElementById("mod-icon");
const iconPreview = document.getElementById("icon-preview");
const removeIconButton = document.getElementById("remove-icon-btn");

const folderSelect = document.getElementById("folder-select");
const fileInput = document.getElementById("file-input");
const filesList = document.getElementById("files-list");

const addObjectGroupInput = document.getElementById("add-object-group");
const addObjectGroupOptions = document.getElementById("add-object-group-options");
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

const mainTabs = new bootstrap.Tab(document.getElementById('visual-tab'));
const codeTab = document.getElementById('code-tab');

// Custom Modal for alerts and confirms
function createModal(title, message, isConfirm, onConfirm) {
    const modalId = `custom-modal-${Math.random().toString(36).substr(2, 9)}`;
    const modalHtml = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content soft">
                    <div class="modal-header border-0">
                        <h5 class="modal-title text-white">${title}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-muted-2">
                        ${message}
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
                        ${isConfirm ? `<button type="button" class="btn btn-primary" id="confirm-btn">Подтвердить</button>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalElement = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
    });

    if (isConfirm) {
        const confirmBtn = modalElement.querySelector('#confirm-btn');
        confirmBtn.addEventListener('click', () => {
            onConfirm();
            modal.hide();
        });
    }
}

function showAlert(message, title = "Уведомление") {
    createModal(title, message, false);
}

function showConfirm(message, title = "Подтверждение", onConfirm) {
    createModal(title, message, true, onConfirm);
}


let cm = CodeMirror(document.getElementById("editor"), {
    value: "{\n  \n}",
    mode: {
        name: "javascript",
        json: true
    },
    theme: "material-darker",
    lineNumbers: false,
    tabSize: 2,
    indentUnit: 2,
    lineWrapping: true,
});

// Utility function to debounce function calls
const debounce = (fn, ms = 400) => {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
};

function getValueForLang(obj, lang) {
    if (typeof obj === "string") {
        return obj;
    }
    const upperLang = lang.toUpperCase();
    const lowerLang = lang.toLowerCase();
    return obj?.[upperLang] || obj?.[lowerLang] || "";
}

function setValueForLang(obj, lang, value) {
    if (typeof obj === "object" && obj !== null) {
        const upperLang = lang.toUpperCase();
        if (value) {
            obj[upperLang] = value;
        } else {
            delete obj[upperLang];
        }
    }
}

function getObjectKeyByValue(obj, value) {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (obj[key] === value) {
                return key;
            }
        }
    }
    return null;
}

const updateCodeMirror = debounce(() => {
    const text = cm.getValue();
    try {
        JSON.parse(text);
        codeError.classList.add("d-none");
    } catch (e) {
        codeError.textContent = "Ошибка JSON: " + e.message;
        codeError.classList.remove("d-none");
    }
}, 500);

cm.on("change", updateCodeMirror);

codeTab.addEventListener('shown.bs.tab', () => {
    cm.refresh();
});

function loadMeta(meta) {
    metaTitle.value = getValueForLang(meta["@title"], currentLanguage);
    metaDesc.value = getValueForLang(meta["@description"], currentLanguage);
    metaAuthor.value = meta["@author"] || "";
    metaVersion.value = meta["@version"] || "";
    updateMetaPreview();
}

function generateJson() {
    const json = {};

    if (model["@title"] && Object.keys(model["@title"]).length > 0) {
        json["@title"] = model["@title"];
    }
    if (model["@description"] && Object.keys(model["@description"]).length > 0) {
        json["@description"] = model["@description"];
    }
    if (model["@author"]) {
        json["@author"] = model["@author"];
    }
    if (model["@version"]) {
        json["@version"] = model["@version"];
    }

    for (const group in model) {
        if (group.startsWith("@")) continue;
        if (Object.keys(model[group]).length > 0) {
            json[group] = model[group];
        }
    }
    return json;
}

(async function loadSchema() {
    try {
        const res = await fetch("https://raw.githubusercontent.com/darkmean-dev/nullsmods-schema/main/schema.json");
        const data = await res.json();
        const props = data?.properties || {};
        schema = props;

        GROUP_KEYS = Object.keys(props).filter(k => !k.startsWith("@"));

        GROUP_KEYS.forEach(g => {
            const params = Object.keys(props[g]?.additionalProperties?.properties || {});
            PARAMS_BY_GROUP[g] = params;
            const examples = props[g]?.propertyNames?.examples || [];
            OBJECT_EXAMPLES_BY_GROUP[g] = ["*", ...examples];
        });

        populateFolderSelect();
        createSearchableDropdown(addObjectGroupInput, addObjectGroupOptions, GROUP_KEYS, addObjectGroupInput.value);
        populateLanguageSelect();
        renderAll();
    } catch (error) {
        console.error("Failed to load schema:", error);
        showAlert("Не удалось загрузить схему модов. Некоторые функции могут не работать.");
    }
})();

function populateLanguageSelect() {
    languageSelect.innerHTML = "";
    KNOWN_LANGUAGES.forEach(lang => {
        const opt = document.createElement("option");
        opt.value = lang;
        opt.textContent = lang.toUpperCase();
        languageSelect.appendChild(opt);
    });
    languageSelect.value = currentLanguage;
}

languageSelect.addEventListener("change", (e) => {
    currentLanguage = e.target.value;
    repaint();
});


const debouncedUpdateJson = debounce(() => {
    const outputModel = JSON.parse(JSON.stringify(model));

    if (outputModel["@title"] && typeof outputModel["@title"] === 'object') {
        const titleText = getValueForLang(outputModel["@title"], currentLanguage);
        outputModel["@title"] = titleText || Object.values(outputModel["@title"])[0] || "";
    }

    if (outputModel["@description"] && typeof outputModel["@description"] === 'object') {
        const descText = getValueForLang(outputModel["@description"], currentLanguage);
        outputModel["@description"] = descText || Object.values(outputModel["@description"])[0] || "";
    }

    jsonPreview.textContent = JSON.stringify(outputModel, null, 2);
    cm.setValue(JSON.stringify(model, null, 2));
}, 500);

metaTitle.addEventListener("input", (e) => {
    if (!model["@title"]) model["@title"] = {};
    setValueForLang(model["@title"], currentLanguage, e.target.value);
    updateMetaPreview();
    debouncedUpdateJson();
});

metaDesc.addEventListener("input", (e) => {
    if (!model["@description"]) model["@description"] = {};
    setValueForLang(model["@description"], currentLanguage, e.target.value);
    updateMetaPreview();
    debouncedUpdateJson();
});

metaAuthor.addEventListener("input", (e) => {
    model["@author"] = e.target.value;
    updateMetaPreview();
    debouncedUpdateJson();
});

metaVersion.addEventListener("input", (e) => {
    model["@version"] = e.target.value;
    updateMetaPreview();
    debouncedUpdateJson();
});


function cleanupMeta() {
    // This function is no longer needed on every input,
    // as cleanup is now handled on export.
}

function updateMetaPreview() {
    const titleText = getValueForLang(model["@title"], currentLanguage);
    const descText = getValueForLang(model["@description"], currentLanguage);
    const authorText = model["@author"];

    if (titleText || descText || authorText) {
        metaPreview.classList.remove("d-none");
        previewTitle.innerHTML = titleText || "Название мода";
        previewDescription.innerHTML = (descText || "Описание мода").replace(/\n/g, '<br>');
        previewAuthor.innerHTML = authorText ? `Автор: ${authorText}` : "Автор: Не указан";
    } else {
        metaPreview.classList.add("d-none");
    }
}

iconInput.addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    const img = new Image();
    img.src = URL.createObjectURL(f);
    img.onload = () => {
        if (img.width > 640 || img.height > 640) {
            showAlert("Иконка должна быть ≤640×640");
            iconInput.value = "";
            iconPreview.classList.add("d-none");
            iconPreview.removeAttribute("src");
            modIconFile = null;
        } else {
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

function populateFolderSelect() {
    folderSelect.innerHTML = "";
    KNOWN_FOLDERS.forEach(f => {
        const opt = document.createElement("option");
        opt.value = f;
        opt.textContent = f;
        folderSelect.appendChild(opt);
    });
}

fileInput.addEventListener("change", e => {
    const folder = folderSelect.value || KNOWN_FOLDERS[0];
    [...e.target.files].forEach(f => {
        if (!files.some(item => item.folder === folder && item.file.name === f.name)) {
            files.push({
                file: f,
                folder
            });
        }
    });
    e.target.value = "";
    renderFiles();
});

function renderFiles() {
    filesList.innerHTML = "";
    if (files.length === 0) {
        const li = document.createElement("li");
        li.className = "list-group-item text-muted-2";
        li.textContent = "Пока нет файлов...";
        filesList.appendChild(li);
        return;
    }
    files.forEach((item, idx) => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center";
        li.textContent = `${item.folder}/${item.file.name}`;
        const del = document.createElement("button");
        del.className = "btn btn-sm btn-danger";
        del.textContent = "Удалить";
        del.addEventListener("click", () => {
            files.splice(idx, 1);
            renderFiles();
        });
        li.appendChild(del);
        filesList.appendChild(li);
    });
}

// Custom Select / Searchable Dropdown Logic
function createSearchableDropdown(inputElement, optionsContainer, allOptions, selectedValue, onSelectCallback) {
    optionsContainer.innerHTML = "";

    allOptions.forEach(option => {
        const div = document.createElement("div");
        div.className = "option-item";
        div.textContent = option;
        div.onclick = () => {
            selectOption(inputElement, optionsContainer, option);
            if (onSelectCallback) onSelectCallback(option);
        };
        optionsContainer.appendChild(div);
    });

    inputElement.value = selectedValue || "";

    inputElement.addEventListener("input", () => {
        filterOptions(inputElement, optionsContainer);
    });

    inputElement.addEventListener("focus", () => {
        toggleDropdown(optionsContainer, true);
        filterOptions(inputElement, optionsContainer);
    });
}

function filterOptions(searchInput, optionsContainer) {
    const searchInputText = searchInput.value.toLowerCase();
    const options = Array.from(optionsContainer.children);

    options.forEach(option => {
        if (option.textContent.toLowerCase().includes(searchInputText)) {
            option.style.display = "block";
        } else {
            option.style.display = "none";
        }
    });

    toggleDropdown(optionsContainer, true);
}

function selectOption(inputElement, optionsContainer, value) {
    inputElement.value = value;
    toggleDropdown(optionsContainer, false);
}

function toggleDropdown(container, show) {
    container.style.display = show ? "block" : "none";
}

document.addEventListener("click", (event) => {
    document.querySelectorAll('.options-container').forEach(container => {
        const inputElement = container.previousElementSibling;
        if (inputElement && !inputElement.contains(event.target) && !container.contains(event.target)) {
            toggleDropdown(container, false);
        }
    });
});
// End of Custom Select / Searchable Dropdown Logic


addObjBtn.addEventListener("click", () => {
    const group = addObjectGroupInput.value;
    addObject(group);
    addObjectGroupInput.value = "";
    toggleDropdown(addObjectGroupOptions, false);
});

function addObject(group, objName = "*") {
    if (!group) return;
    if (!model[group]) model[group] = {};
    
    // Check if the group name is in the schema before proceeding
    if (!GROUP_KEYS.includes(group)) {
        showAlert(`Группа "${group}" не найдена в схеме.`);
        return;
    }

    if (model[group][objName] === undefined) {
        model[group][objName] = {};
    }

    if (Object.keys(model[group][objName]).length === 0) {
        const firstParam = PARAMS_BY_GROUP[group]?.[0];
        if (firstParam) {
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

function renderGroups() {
    groupsRoot.innerHTML = "";
    const hasContent = GROUP_KEYS.some(g => model[g] && Object.keys(model[g]).length > 0);

    if (!hasContent) {
        const emptyState = document.createElement('div');
        emptyState.className = 'text-center p-5 text-muted-2';
        emptyState.innerHTML = `
            <h5 class="fw-normal">Объектов пока нет</h5>
            <p class="mb-0">Используйте поле поиска и кнопку "Добавить", чтобы начать.</p>
        `;
        groupsRoot.appendChild(emptyState);
        return;
    }

    GROUP_KEYS.forEach(group => {
        const groupObj = model[group] || {};
        if (Object.keys(groupObj).length === 0) return;

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

        Object.keys(groupObj).forEach(objectName => {
            const params = groupObj[objectName] || {};
            const oCard = document.createElement("div");
            oCard.className = "object-card";

            const objSelectContainer = document.createElement("div");
            objSelectContainer.className = "object-head custom-select-container";

            const objSelectInput = document.createElement("input");
            objSelectInput.type = "text";
            objSelectInput.className = "form-control form-control-dark custom-select-input object-select";
            objSelectInput.placeholder = "Поиск объекта...";
            objSelectInput.value = objectName;

            const objSelectOptions = document.createElement("div");
            objSelectOptions.className = "options-container";

            createSearchableDropdown(
                objSelectInput,
                objSelectOptions,
                [...new Set([...OBJECT_EXAMPLES_BY_GROUP[group], objectName])],
                objectName,
                (newName) => {
                    if (newName === objectName) return;
                    model[group][newName] = model[group][objectName] || {};
                    delete model[group][objectName];
                    repaint();
                }
            );

            objSelectContainer.appendChild(objSelectInput);
            objSelectContainer.appendChild(objSelectOptions);


            const actionsContainer = document.createElement("div");
            actionsContainer.className = "object-actions";
            const addParam = document.createElement("button");
            addParam.className = "btn btn-sm btn-outline-light";
            addParam.textContent = "Параметр";
            addParam.addEventListener("click", () => {
                model[group][objectName]["новый_параметр"] = "";
                repaint();
            });
            const delObj = document.createElement("button");
            delObj.className = "btn btn-sm btn-danger";
            delObj.textContent = "Удалить";
            delObj.addEventListener("click", () => {
                showConfirm(`Вы уверены, что хотите удалить объект "${objectName}"?`, "Подтверждение", () => {
                    delete model[group][objectName];
                    if (Object.keys(model[group]).length === 0) delete model[group];
                    repaint();
                });
            });
            actionsContainer.appendChild(addParam);
            actionsContainer.appendChild(delObj);

            const pList = document.createElement("div");
            pList.className = "param-list";

            Object.keys(params).forEach(paramName => {
                const paramSchema = schema[group]?.additionalProperties?.properties?.[paramName];
                const isBoolean = paramSchema?.type === 'boolean';
                const isObject = paramSchema?.type === 'object';
                const isNumber = paramSchema?.type === 'number';

                const pill = document.createElement("div");
                pill.className = "param-pill";

                const paramHeader = document.createElement('div');
                paramHeader.className = 'd-flex align-items-center gap-2';

                // Dropdown for parameter name
                const paramNameSelect = document.createElement("select");
                paramNameSelect.className = "form-select form-select-sm form-select-dark param-name-select";
                
                const allParams = PARAMS_BY_GROUP[group];
                const availableParams = allParams.filter(p => !Object.keys(params).includes(p) || p === paramName);
                if (!availableParams.includes(paramName)) {
                    availableParams.push(paramName);
                }
                availableParams.forEach(p => {
                    const option = document.createElement("option");
                    option.value = p;
                    option.textContent = p;
                    paramNameSelect.appendChild(option);
                });
                
                paramNameSelect.value = paramName;

                paramNameSelect.addEventListener('change', (e) => {
                    const newParamName = e.target.value;
                    const oldValue = model[group][objectName][paramName];
                    delete model[group][objectName][paramName];
                    model[group][objectName][newParamName] = oldValue;
                    repaint();
                });

                paramHeader.appendChild(paramNameSelect);

                const addValueBtn = document.createElement("button");
                addValueBtn.className = "add-value-btn";
                addValueBtn.textContent = "+";
                addValueBtn.addEventListener("click", () => {
                    const currentValue = model[group][objectName][paramName];
                    if (Array.isArray(currentValue)) {
                        currentValue.push("");
                    } else {
                        model[group][objectName][paramName] = [currentValue, ""];
                    }
                    repaint();
                });
                paramHeader.appendChild(addValueBtn);

                pill.appendChild(paramHeader);

                const valueContainer = document.createElement("div");
                valueContainer.className = `param-value ${Array.isArray(params[paramName]) ? 'multiple' : ''}`;

                if (Array.isArray(params[paramName])) {
                    const values = params[paramName] || [""];
                    values.forEach((value, valueIndex) => {
                        const valueItem = document.createElement("div");
                        valueItem.className = "multiple-value-item";
                        const input = document.createElement("input");
                        input.type = "text";
                        input.value = value;
                        input.addEventListener("input", (e) => {
                            let newValue = e.target.value;
                            if (paramSchema?.items?.type === 'number') {
                                newValue = parseFloat(newValue);
                            }
                            model[group][objectName][paramName][valueIndex] = newValue;
                            debouncedUpdateJson();
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
                } else if (isBoolean) {
                    const input = document.createElement("input");
                    input.type = "checkbox";
                    input.checked = params[paramName];
                    input.addEventListener("change", (e) => {
                        model[group][objectName][paramName] = e.target.checked;
                        debouncedUpdateJson();
                    });
                    valueContainer.appendChild(input);
                } else if (isObject) {
                    const obj = params[paramName] || {};
                    const objKey = Object.keys(obj)[0];
                    const objValue = obj[objKey];

                    const objContainer = document.createElement('div');
                    objContainer.className = 'd-flex gap-2';

                    const keyInput = document.createElement('input');
                    keyInput.type = 'text';
                    keyInput.placeholder = 'key';
                    keyInput.value = objKey || '';
                    keyInput.addEventListener('input', debounce((e) => {
                        const newKey = e.target.value;
                        const oldValue = model[group][objectName][paramName]?.[objKey];
                        if (newKey) {
                            model[group][objectName][paramName] = { [newKey]: oldValue || "" };
                        } else {
                            delete model[group][objectName][paramName];
                        }
                        repaint();
                    }, 500));

                    const valueInput = document.createElement('input');
                    valueInput.type = 'text';
                    valueInput.placeholder = 'value';
                    valueInput.value = objValue || '';
                    valueInput.addEventListener('input', (e) => {
                        if (objKey) {
                            model[group][objectName][paramName][objKey] = e.target.value;
                        }
                        debouncedUpdateJson();
                    });

                    objContainer.appendChild(keyInput);
                    objContainer.appendChild(valueInput);
                    valueContainer.appendChild(objContainer);
                }
                else {
                    const input = document.createElement("input");
                    input.type = isNumber ? 'number' : 'text';
                    input.value = params[paramName];
                    input.addEventListener("input", (e) => {
                        let value = e.target.value;
                        if (input.type === 'number') {
                            value = parseFloat(value);
                            if (isNaN(value)) {
                                value = e.target.value;
                            }
                        }
                        model[group][objectName][paramName] = value;
                        debouncedUpdateJson();
                    });
                    valueContainer.appendChild(input);
                }

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

function repaint() {
    loadMeta(model);
    renderGroups();
    renderFiles();
    debouncedUpdateJson();
}

function renderAll() {
    repaint();
    renderFiles();
}

exportBtn.addEventListener("click", async () => {
    const zip = new JSZip();

    // Add JSON
    const modJson = generateJson();
    zip.file("content.json", JSON.stringify(modJson, null, 2));

    // Add Icon
    if (modIconFile) {
        zip.file("icon.png", modIconFile);
    }

    // Add Files
    if (files.length > 0) {
        const dataFolder = zip.folder("data");
        files.forEach(item => {
            const folder = dataFolder.folder(item.folder);
            folder.file(item.file.name, item.file);
        });
    }

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = "mod.zip";
    link.click();
});

importBtn.addEventListener("click", () => importZipInput.click());

importZipInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const zip = await JSZip.loadAsync(file);
        const newModel = {};
        const newFiles = [];
        let newModIconFile = null;

        // Process content.json
        const jsonFile = zip.file("content.json");
        if (jsonFile) {
            const content = await jsonFile.async("string");
            Object.assign(newModel, JSON.parse(content));
        }

        // Process icon.png
        const iconFile = zip.file("icon.png");
        if (iconFile) {
            const blob = await iconFile.async("blob");
            newModIconFile = new File([blob], "icon.png", { type: "image/png" });
            const img = new Image();
            img.src = URL.createObjectURL(newModIconFile);
            img.onload = () => {
                iconPreview.src = img.src;
                iconPreview.classList.remove("d-none");
                removeIconButton.classList.remove("d-none");
            };
        }

        // Process data files
        zip.folder("data").forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
                const parts = relativePath.split('/');
                const folder = parts[0];
                const fileName = parts[1];
                if (KNOWN_FOLDERS.includes(folder)) {
                    zipEntry.async("blob").then(blob => {
                        const fileObj = new File([blob], fileName);
                        newFiles.push({
                            file: fileObj,
                            folder: folder
                        });
                    });
                }
            }
        });

        model = newModel;
        files = newFiles;
        modIconFile = newModIconFile;
        loadMeta(model);
        repaint();

        showAlert("Мод успешно импортирован!");
    } catch (error) {
        console.error("Error importing ZIP:", error);
        showAlert("Не удалось импортировать ZIP-файл. Пожалуйста, проверьте формат файла.");
    } finally {
        importZipInput.value = "";
    }
});

formatBtn.addEventListener("click", () => {
    try {
        const formatted = JSON.stringify(JSON.parse(cm.getValue()), null, 2);
        cm.setValue(formatted);
        codeError.classList.add("d-none");
    } catch (e) {
        codeError.textContent = "Невозможно отформатировать, неверный JSON.";
        codeError.classList.remove("d-none");
    }
});

applyBtn.addEventListener("click", () => {
    try {
        const newModel = JSON.parse(cm.getValue());
        model = newModel;
        repaint();
        showAlert("Изменения применены!");
        codeError.classList.add("d-none");
        mainTabs.show();
    } catch (e) {
        codeError.textContent = "Не удалось применить, неверный JSON: " + e.message;
        codeError.classList.remove("d-none");
    }
});
