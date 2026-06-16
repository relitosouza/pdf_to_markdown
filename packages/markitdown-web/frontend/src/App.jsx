import { useState, useRef } from 'react';
import { marked } from 'marked';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [convertedMarkdown, setConvertedMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);

  // Helper: Format bytes to human readable size
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Helper: Get file icon based on extension
  const getFileIcon = (fileName) => {
    if (!fileName) return '📄';
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📕';
    if (['docx', 'doc'].includes(ext)) return '📘';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return '📗';
    if (['pptx', 'ppt'].includes(ext)) return '📙';
    return '📄';
  };

  // Handlers for File Selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const removeFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // API Call: Convert File
  const handleConvert = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setConvertedMarkdown('');
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setConvertedMarkdown(data.content);
        setActiveTab('preview');
      } else {
        setError({
          title: data.error || 'Erro de Conversão',
          message: data.detail || 'Não foi possível converter o arquivo.',
        });
      }
    } catch (err) {
      console.error('Conversion error:', err);
      setError({
        title: 'Erro de Conexão',
        message: 'Não foi possível estabelecer conexão com o servidor de processamento.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Toolbar actions
  const handleCopy = () => {
    if (!convertedMarkdown) return;
    navigator.clipboard.writeText(convertedMarkdown)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        alert('Não foi possível copiar o texto automaticamente.');
      });
  };

  const handleDownload = () => {
    if (!convertedMarkdown) return;
    const blob = new Blob([convertedMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const baseName = selectedFile ? selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) : 'documento';
    a.href = url;
    a.download = `${baseName}.md`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  };

  // Parse Markdown HTML safely
  const getMarkdownHtml = () => {
    if (!convertedMarkdown) return { __html: '' };
    try {
      return { __html: marked.parse(convertedMarkdown) };
    } catch (e) {
      return { __html: `<pre style="white-space: pre-wrap;">${convertedMarkdown}</pre>` };
    }
  };

  return (
    <div className="app-container">
      {/* Header Section */}
      <header className="app-header">
        <div className="logo-area">
          <span className="logo-icon">✨</span>
          <span className="logo-text">Mark<span>It</span>Down</span>
        </div>
        <p className="subtitle">Converta seus arquivos para Markdown de maneira elegante para LLMs ou documentação</p>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="converter-grid">
          
          {/* Left Panel: Upload Area */}
          <section className="panel upload-panel">
            <div className="panel-header">
              <h2>1. Enviar Arquivo</h2>
              <span className="step-badge">Etapa 1</span>
            </div>

            {/* Drop Zone / Drag & Drop */}
            {!selectedFile ? (
              <div 
                className={`drop-zone ${dragOver ? 'dragover' : ''}`}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="drop-zone-content">
                  <div className="upload-icon">📂</div>
                  <h3>Arraste e solte o arquivo aqui</h3>
                  <p>ou clique para explorar suas pastas</p>
                  <span className="file-limits">Suporta PDF, DOCX, XLSX, PPTX, TXT, etc.</span>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="file-input" 
                  accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv,.json,.epub,.xml"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              /* File Details Card */
              <div className="file-card">
                <div className="file-card-icon">{getFileIcon(selectedFile.name)}</div>
                <div className="file-card-details">
                  <span className="file-name" title={selectedFile.name}>{selectedFile.name}</span>
                  <span className="file-size">{formatBytes(selectedFile.size)}</span>
                </div>
                <button 
                  type="button" 
                  className="remove-file-btn" 
                  onClick={removeFile}
                  title="Remover arquivo"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Action Button */}
            <button 
              type="button" 
              className={`action-btn ${!selectedFile || loading ? 'disabled' : ''}`} 
              disabled={!selectedFile || loading}
              onClick={handleConvert}
            >
              <span>{loading ? 'Convertendo...' : 'Converter para Markdown'}</span>
              <span className="btn-icon">⚡</span>
            </button>

            {/* Info panel */}
            <div className="info-block">
              <h4>Formatos Suportados</h4>
              <ul className="formats-list">
                <li><span className="badge pdf">PDF</span> Documentos portáteis</li>
                <li><span className="badge docx">Word</span> Documentos do Word (.docx)</li>
                <li><span className="badge pptx">PPTX</span> Apresentações PowerPoint</li>
                <li><span className="badge xlsx">Excel</span> Planilhas do Excel (.xlsx)</li>
                <li><span className="badge text">Outros</span> Textos, CSV, JSON, HTML, EPUB</li>
              </ul>
              <div className="security-note">
                <span className="shield-icon">🛡️</span>
                <p><strong>Privacidade Garantida:</strong> Os arquivos são processados na hora em memória e não ficam salvos permanentemente no servidor.</p>
              </div>
            </div>
          </section>

          {/* Right Panel: Conversion Result */}
          <section className="panel result-panel">
            <div className="panel-header">
              <h2>2. Resultado da Conversão</h2>
              <span className="step-badge">Etapa 2</span>
            </div>

            <div className="editor-container">
              {/* Toolbar */}
              <div className="toolbar">
                <div className="tabs">
                  <button 
                    type="button" 
                    className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                    onClick={() => setConvertedMarkdown && setActiveTab('preview')}
                  >
                    👁️ Preview Formatado
                  </button>
                  <button 
                    type="button" 
                    className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
                    onClick={() => setConvertedMarkdown && setActiveTab('raw')}
                  >
                    📝 Markdown Bruto
                  </button>
                </div>
                <div className="actions">
                  <button 
                    type="button" 
                    className={`tool-btn ${!convertedMarkdown ? 'disabled' : ''}`}
                    disabled={!convertedMarkdown}
                    onClick={handleCopy}
                    title="Copiar para área de transferência"
                  >
                    {copied ? '✅ Copiado!' : '📋 Copiar'}
                  </button>
                  <button 
                    type="button" 
                    className={`tool-btn primary ${!convertedMarkdown ? 'disabled' : ''}`}
                    disabled={!convertedMarkdown}
                    onClick={handleDownload}
                    title="Baixar arquivo Markdown"
                  >
                    💾 Baixar .md
                  </button>
                </div>
              </div>

              {/* View Panel Content */}
              <div className="views-wrapper">
                
                {/* Loading State */}
                {loading && (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Processando o arquivo...</p>
                    <span className="loading-subtitle">Executando análise estrutural com MarkItDown</span>
                  </div>
                )}

                {/* Empty / Idle State / Error State */}
                {!loading && !convertedMarkdown && (
                  <div className="empty-state">
                    {error ? (
                      <>
                        <div className="empty-icon">⚠️</div>
                        <h3 style={{ color: 'var(--error)' }}>{error.title}</h3>
                        <p>{error.message}</p>
                      </>
                    ) : (
                      <>
                        <div className="empty-icon">✨</div>
                        <h3>Seu markdown aparecerá aqui</h3>
                        <p>Faça o upload e converta um arquivo para ver a mágica acontecer</p>
                      </>
                    )}
                  </div>
                )}

                {/* Rendered HTML Tab */}
                {!loading && convertedMarkdown && activeTab === 'preview' && (
                  <div 
                    className="view-content formatted-view markdown-body"
                    dangerouslySetInnerHTML={getMarkdownHtml()}
                  />
                )}

                {/* Plain Text Tab */}
                {!loading && convertedMarkdown && activeTab === 'raw' && (
                  <div className="view-content raw-view">
                    <textarea 
                      value={convertedMarkdown} 
                      readOnly 
                      placeholder="Código Markdown aparecerá aqui..."
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Footer Section */}
      <footer className="app-footer">
        <p>Desenvolvido com 🤍 utilizando o Microsoft <strong>MarkItDown</strong> como base de processamento local.</p>
      </footer>
    </div>
  );
}

export default App;
