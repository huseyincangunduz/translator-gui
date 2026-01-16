// this file will be builded with ../../tsconfig.renderer.json

// Ana uygulama mantığı
let projectPath: string | null = null;
let jsonFiles: { path: string; data: any[] }[] = [];
let foundStrings: any[] = [];
let selectedString: any | null = null;

// DOM Elements
const projectPathInput = document.getElementById(
  "project-path"
) as HTMLInputElement;
const btnSelectFolder = document.getElementById(
  "btn-select-folder"
) as HTMLButtonElement;
const btnScan = document.getElementById("btn-scan") as HTMLButtonElement;

const btnSelectJson = document.getElementById(
  "btn-select-json"
) as HTMLButtonElement;
const jsonFilesList = document.getElementById(
  "json-files-list"
) as HTMLDivElement;

const searchStrings = document.getElementById(
  "search-strings"
) as HTMLInputElement;
const stringCount = document.getElementById("string-count") as HTMLSpanElement;
const stringsContainer = document.getElementById(
  "strings-container"
) as HTMLDivElement;

const translationForm = document.getElementById(
  "translation-form"
) as HTMLDivElement;
const selectedStringDiv = document.getElementById(
  "selected-string"
) as HTMLDivElement;
// const targetJsonSelect = document.getElementById(
//   "target-json"
// ) as HTMLSelectElement;
const translationPrefix = document.getElementById(
  "translation-prefix"
) as HTMLInputElement;
const translationKey = document.getElementById(
  "translation-key"
) as HTMLInputElement;
const fullKey = document.getElementById("full-key") as HTMLDivElement;
const btnAddTranslation = document.getElementById(
  "btn-add-translation"
) as HTMLButtonElement;
const btnCancel = document.getElementById("btn-cancel") as HTMLButtonElement;
const translationsContainer = document.querySelector(
  "#translation-form .translations"
) as HTMLDivElement;

const statusBar = document.getElementById("status-bar") as HTMLDivElement;

// Event Listeners
btnSelectFolder.addEventListener("click", selectProjectFolder);
btnScan.addEventListener("click", scanProject);
btnSelectJson.addEventListener("click", selectTranslationFiles);
searchStrings.addEventListener("input", filterStrings);
translationPrefix.addEventListener("input", updateFullKey);
translationKey.addEventListener("input", updateFullKey);
btnAddTranslation.addEventListener("click", addTranslation);
btnCancel.addEventListener("click", cancelTranslation);

async function addTranslationStringsByLanguage() {
  if (jsonFiles.length === 0) return;
  if (!selectedString) return;
  if (projectPath === null) return;

  // Mevcutları temizle
  translationsContainer.innerHTML = "";

  // Her JSON dosyası için bir textarea ekle
  jsonFiles.forEach((file, index) => {
    const fileName = file.path.split("/").pop();
    const language = fileName?.split(".")[0] || `lang${index + 1}`;

    const translationDiv = document.createElement("div");
    translationDiv.className = "form-group";

    const label = document.createElement("label");
    label.textContent = `Çeviri (${language}):`;

    const textarea = document.createElement("textarea");
    textarea.id = `translation-${language}`;
    textarea.rows = 3;
    textarea.placeholder = `Çeviriyi buraya girin (${language})`;
    textarea.value = selectedString.text; // Varsayılan olarak orijinal metin
    
    translationDiv.appendChild(label);
    translationDiv.appendChild(textarea);
    translationsContainer.appendChild(translationDiv);
  });
}

// Functions
async function selectProjectFolder() {
  const path = await window.electronAPI.selectFolder();
  if (path) {
    projectPath = path;
    projectPathInput.value = path;
    btnScan.disabled = false;
    updateStatus("Proje klasörü seçildi");
  }
}

async function scanProject() {
  if (!projectPath) return;

  updateStatus("Proje taranıyor...");
  btnScan.disabled = true;

  // TypeScript ve HTML dosyalarını tara
  const result = await window.electronAPI.scanDirectory(projectPath, [
    ".ts",
    ".html",
  ]);

  if (!result.success || !result.files) {
    updateStatus("Tarama hatası: " + result.error);
    btnScan.disabled = false;
    return;
  }

  foundStrings = [];

  // Her dosyayı oku ve string'leri çıkar
  for (const filePath of result.files) {
    const fileResult = await window.electronAPI.readFile(filePath);
    if (fileResult.success && fileResult.content) {
      const strings = extractStrings(filePath, fileResult.content);
      foundStrings.push(...strings);
    }
  }

  displayStrings(foundStrings);
  updateStatus(`${foundStrings.length} string bulundu`);
  btnScan.disabled = false;
}

function extractStrings(filePath: string, content: string): any[] {
  const strings: any[] = [];
  const isHtml = filePath.endsWith(".html");

  if (isHtml) {
    // HTML string'lerini çıkar (basit regex ile)
    // Örnek: >Text<, attribute="text"
    const textRegex = />([^<>]+)</g;
    let match;

    while ((match = textRegex.exec(content)) !== null) {
      const text = match[1].trim();
      if (text && text.length > 2 && !text.match(/^[\d\s\{\}]+$/)) {
        strings.push({
          text,
          file: filePath,
          type: "html-text",
          line: content.substring(0, match.index).split("\n").length,
        });
      }
    }
  } else {
    // TypeScript string literal'lerini çıkar
    const stringRegex = /(['"`])(?:(?=(\\?))\2.)*?\1/g;
    let match;

    while ((match = stringRegex.exec(content)) !== null) {
      const text = match[0].slice(1, -1); // Tırnakları çıkar
      if (
        text &&
        text.length > 2 &&
        !text.startsWith("http") &&
        !text.match(/^[\d\s\.\-\_]+$/)
      ) {
        strings.push({
          text,
          file: filePath,
          type: "typescript",
          line: content.substring(0, match.index).split("\n").length,
          fullMatch: match[0],
        });
      }
    }
  }

  return strings;
}

function displayStrings(strings: any[]) {
  if (strings.length === 0) {
    stringsContainer.innerHTML =
      '<p class="empty-state">Hiç string bulunamadı</p>';
    stringCount.textContent = "0 string";
    return;
  }

  stringCount.textContent = `${strings.length} string`;

  stringsContainer.innerHTML = strings
    .map(
      (str, index) => `
    <div class="string-item" data-index="${index}">
      <div class="string-text">"${escapeHtml(str.text)}"</div>
      <div class="string-location">
        <span class="string-type">${str.type}</span>
        ${str.file.split("/").pop()} - Line ${str.line}
      </div>
    </div>
  `
    )
    .join("");

  // Her item'a click handler ekle
  document.querySelectorAll(".string-item").forEach((item) => {
    item.addEventListener("click", () => {
      const index = parseInt(item.getAttribute("data-index") || "0");
      selectString(strings[index]);

      // Seçili görünümü güncelle
      document
        .querySelectorAll(".string-item")
        .forEach((i) => i.classList.remove("selected"));
      item.classList.add("selected");
    });
  });
}

function filterStrings() {
  const query = searchStrings.value.toLowerCase();
  const filtered = foundStrings.filter(
    (str) =>
      str.text.toLowerCase().includes(query) ||
      str.file.toLowerCase().includes(query)
  );
  displayStrings(filtered);
}

function selectString(str: any) {
  selectedString = str;
  selectedStringDiv.textContent = `"${str.text}"`;
  translationForm.style.display = "block";

  // Hedef JSON dropdown'ı güncelle
  updateTargetJsonDropdown();

  // Otomatik key önerisi
  const suggestedKey = str.text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .join("-")
    .substring(0, 30);

  translationKey.value = suggestedKey;
  updateFullKey();
}

function updateTargetJsonDropdown() {
  addTranslationStringsByLanguage();

  // Aşağıdaki kod artık kullanılmıyor çünkü her JSON için textarea ekleniyor
  // targetJsonSelect.innerHTML = "";

  // if (jsonFiles.length === 0) {
  //   targetJsonSelect.innerHTML = "<option>Önce JSON dosyası seç</option>";
  //   targetJsonSelect.disabled = true;
  //   return;
  // }

  // jsonFiles.forEach((file, index) => {
  //   const option = document.createElement("option");
  //   option.value = index.toString();
  //   option.textContent = file.path.split("/").pop() || file.path;
  //   targetJsonSelect.appendChild(option);
  // });

  // targetJsonSelect.disabled = false;
}

function updateFullKey() {
  const prefix = translationPrefix.value.trim();
  const key = translationKey.value.trim();

  if (prefix && key) {
    fullKey.textContent = `${prefix}.${key}`;
  } else {
    fullKey.textContent = "(prefix ve key gerekli)";
  }
}

async function selectTranslationFiles() {
  const paths = await window.electronAPI.selectFiles([
    { name: "JSON Files", extensions: ["json"] },
  ]);
  //   alert(paths.length + " dosya seçildi");
  //   alert(typeof paths + " " + paths);
  if (paths && paths.length > 0) {
    updateStatus("JSON dosyaları yükleniyor...");
    for (const path of paths) {
      // Zaten yüklü mü kontrol et
      if (jsonFiles.find((f) => f.path === path)) continue;

      const result = await window.electronAPI.readFile(path);
      if (result.success && result.content) {
        try {
          const data = JSON.parse(result.content);
          jsonFiles.push({ path, data });
        } catch (error) {
          updateStatus(
            `JSON parse hatası (${path}): ${(error as Error).message}`
          );
        }
      }
    }

    displayJsonFiles();
    updateStatus(`${jsonFiles.length} JSON dosyası yüklendi`);
  }
}

function displayJsonFiles() {
  if (jsonFiles.length === 0) {
    jsonFilesList.innerHTML =
      '<p class="empty-state">Henüz JSON dosyası seçilmedi</p>';
    return;
  }

  jsonFilesList.innerHTML = jsonFiles
    .map((file, index) => {
      const fileName = file.path.split("/").pop();
      const prefixCount = file.data.length;
      const totalKeys = file.data.reduce(
        (sum, p) => sum + Object.keys(p.stringMap).length,
        0
      );

      return `
      <div class="json-file-item">
        <div class="json-file-info">
          <div class="json-file-path">${fileName}</div>
          <div class="json-file-stats">${prefixCount} prefix, ${totalKeys} çeviri</div>
        </div>
        <div class="json-file-actions">
          <button class="btn-small" onclick="removeJsonFile(${index})">Kaldır</button>
        </div>
      </div>
    `;
    })
    .join("");
}

function removeJsonFile(index: number) {
  jsonFiles.splice(index, 1);
  displayJsonFiles();
  updateStatus("JSON dosyası kaldırıldı");
}

// Global scope'a ekle (onclick için)
(window as any).removeJsonFile = removeJsonFile;

async function addTranslation() {
  if (!selectedString || jsonFiles.length === 0) return;

  // const targetJson = jsonFiles[targetIndex];

  await addTranslationToFile();

  // cancelTranslation();
}

async function addTranslationToFile() {
  const prefix = translationPrefix.value.trim();
  const key = translationKey.value.trim();
  alert("Prefix: " + prefix + " Key: " + key);
  if (!prefix || !key) {
    alert("Prefix ve key alanları zorunludur");
    return;
  }

  const fullKeyValue = `${prefix}.${key}`;

  for (const targetJson of jsonFiles) {
    // JSON'a dikkatli merge ile ekle
    let prefixGroup = targetJson.data.find((t) => t.prefix === prefix);
    if (!prefixGroup) {
      prefixGroup = { prefix, stringMap: {} };
      targetJson.data.push(prefixGroup);
    }

    // Mevcut key varsa uyar
    if (prefixGroup.stringMap[key]) {
      const overwrite = confirm(
        `"${prefix}.${key}" zaten mevcut. Üzerine yazılsın mı?`
      );
      if (!overwrite) return;
    }

    prefixGroup.stringMap[key] = selectedString.text;

    // JSON dosyasını kaydet - mevcut yapıyı koru
    const jsonContent = JSON.stringify(targetJson.data, null, 2);
    const saveResult = await window.electronAPI.writeFile(
      targetJson.path,
      jsonContent
    );

    if (!saveResult.success) {
      alert("JSON kaydetme hatası: " + saveResult.error);
      return;
    }
  }

  // Kaynak dosyayı güncelle
  const fileResult = await window.electronAPI.readFile(selectedString.file);
  if (!fileResult.success || !fileResult.content) {
    alert("Dosya okuma hatası");
    return;
  }

  let updatedContent = fileResult.content;

  if (selectedString.type === "html-text") {
    // HTML: ">text<" -> ">{{ 'prefix.key' | translate }}<"
    updatedContent = updatedContent.replace(
      `>${selectedString.text}<`,
      `>{{ '${fullKeyValue}' | translate }}<`
    );
  } else {
    // TypeScript: 'text' veya "text" -> translate('prefix.key')
    updatedContent = updatedContent.replace(
      selectedString.fullMatch,
      `this.translate.getString('${fullKeyValue}')`
    );
  }

  const updateResult = await window.electronAPI.writeFile(
    selectedString.file,
    updatedContent
  );

  if (updateResult.success) {
    updateStatus(`✓ Çeviriler eklendi: ${fullKeyValue}}`);

    // JSON stats'ı güncelle
    displayJsonFiles();

    // String'i listeden kaldır
    foundStrings = foundStrings.filter((s) => s !== selectedString);
    displayStrings(foundStrings);
    cancelTranslation();
  } else {
    alert("Dosya güncelleme hatası: " + updateResult.error);
  }
}

function cancelTranslation() {
  selectedString = null;
  translationForm.style.display = "none";
  translationPrefix.value = "";
  translationKey.value = "";

  document
    .querySelectorAll(".string-item")
    .forEach((i) => i.classList.remove("selected"));
}

function updateStatus(message: string) {
  statusBar.textContent = message;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
