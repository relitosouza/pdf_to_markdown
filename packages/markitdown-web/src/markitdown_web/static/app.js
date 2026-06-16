document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    const fileCard = document.getElementById("file-card");
    const selectedFileName = document.getElementById("selected-file-name");
    const selectedFileSize = document.getElementById("selected-file-size");
    const removeFileBtn = document.getElementById("remove-file-btn");
    const convertBtn = document.getElementById("convert-btn");
    
    // Result panels & buttons
    const tabPreviewBtn = document.getElementById("tab-preview-btn");
    const tabRawBtn = document.getElementById("tab-raw-btn");
    const copyBtn = document.getElementById("copy-btn");
    const downloadBtn = document.getElementById("download-btn");
    
    const loadingState = document.getElementById("loading-state");
    const emptyState = document.getElementById("empty-state");
    const formattedView = document.getElementById("formatted-view");
    const rawView = document.getElementById("raw-view");
    const rawMarkdownOutput = document.getElementById("raw-markdown-output");

    let selectedFile = null;
    let convertedMarkdown = "";

    // ----------------------------------------------------
    // Drag & Drop & Selection Handling
    // ----------------------------------------------------
    
    // Trigger file selection on click
    dropZone.addEventListener("click", () => {
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    // Drag-over styling
    ["dragenter", "dragover"].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add("dragover");
        }, false);
    });

    ["dragleave", "drop"].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove("dragover");
        }, false);
    });

    // Handle dropped file
    dropZone.addEventListener("drop", (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFileSelection(files[0]);
        }
    });

    function handleFileSelection(file) {
        selectedFile = file;
        
        // Show file details
        selectedFileName.textContent = file.name;
        selectedFileSize.textContent = formatBytes(file.size);
        
        // Update file icon based on extension
        const ext = file.name.split('.').pop().toLowerCase();
        const fileCardIcon = document.getElementById("file-card-icon");
        if (ext === "pdf") fileCardIcon.textContent = "📕";
        else if (["docx", "doc"].includes(ext)) fileCardIcon.textContent = "📘";
        else if (["xlsx", "xls", "csv"].includes(ext)) fileCardIcon.textContent = "📗";
        else if (["pptx", "ppt"].includes(ext)) fileCardIcon.textContent = "📙";
        else fileCardIcon.textContent = "📄";

        // Toggle UI elements
        dropZone.classList.add("hidden");
        fileCard.classList.remove("hidden");
        
        // Enable convert button
        convertBtn.classList.remove("disabled");
        convertBtn.removeAttribute("disabled");
    }

    // Reset file selection
    removeFileBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Avoid triggering file input click
        resetFileSelection();
    });

    function resetFileSelection() {
        selectedFile = null;
        fileInput.value = "";
        
        // Reset upload zone
        dropZone.classList.remove("hidden");
        fileCard.classList.add("hidden");
        
        // Disable convert button
        convertBtn.classList.add("disabled");
        convertBtn.setAttribute("disabled", "true");
    }

    // Byte formatter
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
    }

    // ----------------------------------------------------
    // API Call & Convert Logic
    // ----------------------------------------------------
    
    convertBtn.addEventListener("click", async () => {
        if (!selectedFile) return;

        // Transition UI to loading state
        emptyState.classList.add("hidden");
        formattedView.classList.add("hidden");
        rawView.classList.add("hidden");
        loadingState.classList.remove("hidden");
        
        // Disable toolbar action buttons
        copyBtn.classList.add("disabled");
        downloadBtn.classList.add("disabled");
        
        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const response = await fetch("/api/convert", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.success) {
                convertedMarkdown = data.content;
                renderMarkdown(convertedMarkdown);
                
                // Switch to preview tab by default
                showTab("preview");
                
                // Enable actions
                copyBtn.classList.remove("disabled");
                downloadBtn.classList.remove("disabled");
            } else {
                showError(data.error || "Erro de Conversão", data.detail || "Não foi possível converter o arquivo.");
            }
        } catch (error) {
            console.error("Conversion error:", error);
            showError("Erro de Conexão", "Não foi possível estabelecer conexão com o servidor de processamento.");
        } finally {
            loadingState.classList.add("hidden");
        }
    });

    function renderMarkdown(markdownText) {
        // Render raw markdown in textarea
        rawMarkdownOutput.value = markdownText;
        
        // Parse markdown to HTML using marked.js
        if (typeof marked !== "undefined" && marked.parse) {
            formattedView.innerHTML = marked.parse(markdownText);
        } else {
            // Fallback if marked didn't load
            formattedView.innerHTML = `<pre style="white-space: pre-wrap;">${markdownText}</pre>`;
        }
    }

    function showError(title, message) {
        emptyState.classList.remove("hidden");
        
        // Temporarily change empty state styling to error
        const emptyIcon = emptyState.querySelector(".empty-icon");
        const emptyTitle = emptyState.querySelector("h3");
        const emptyText = emptyState.querySelector("p");
        
        emptyIcon.textContent = "⚠️";
        emptyTitle.textContent = title;
        emptyTitle.style.color = "var(--error)";
        emptyText.textContent = message;
    }

    // ----------------------------------------------------
    // Tab Navigation
    // ----------------------------------------------------
    
    tabPreviewBtn.addEventListener("click", () => showTab("preview"));
    tabRawBtn.addEventListener("click", () => showTab("raw"));

    function showTab(tabName) {
        if (!convertedMarkdown) return;

        if (tabName === "preview") {
            tabPreviewBtn.classList.add("active");
            tabRawBtn.classList.remove("active");
            formattedView.classList.remove("hidden");
            rawView.classList.add("hidden");
        } else {
            tabPreviewBtn.classList.remove("active");
            tabRawBtn.classList.add("active");
            formattedView.classList.add("hidden");
            rawView.classList.remove("hidden");
        }
    }

    // ----------------------------------------------------
    // Toolbar Actions (Copy & Download)
    // ----------------------------------------------------
    
    copyBtn.addEventListener("click", () => {
        if (!convertedMarkdown || copyBtn.classList.contains("disabled")) return;

        navigator.clipboard.writeText(convertedMarkdown)
            .then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = "✅ Copiado!";
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                }, 2000);
            })
            .catch(err => {
                console.error("Falha ao copiar:", err);
                alert("Não foi possível copiar o texto automaticamente.");
            });
    });

    downloadBtn.addEventListener("click", () => {
        if (!convertedMarkdown || downloadBtn.classList.contains("disabled")) return;

        const blob = new Blob([convertedMarkdown], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        
        // Generate download name
        const baseName = selectedFile ? selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) : "documento";
        a.href = url;
        a.download = `${baseName}.md`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    });
});
