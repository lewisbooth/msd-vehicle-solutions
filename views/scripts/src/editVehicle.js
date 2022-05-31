$$('.pell__editor').forEach(initPellEditor)
const descriptionTextInput = $('#description')

function initPellEditor(pellEditor) {
    const textarea = pellEditor.parentElement.querySelector('textarea')
    const originalContent = textarea ? textarea.value : ''
    const editor = pell.init({
        defaultParagraphSeparator: 'p',
        element: pellEditor,
        actions: [
            'bold', 
            'italic', 
            'paragraph',
            'olist', 
            'ulist'
        ],
        onChange: html => updatePellInput(html, textarea)
    })
    // Copy content from textarea to decode HTML properly
    editor.content.innerHTML = originalContent
    // Force plain text pasting
    editor.addEventListener("paste", function (event) {
        event.preventDefault()    
        var text = (event.originalEvent || event).clipboardData.getData('text/plain')    
        document.execCommand("insertHTML", false, text)
    })
}

function pellCommand(cmdKey, cmdVal) {
	document.execCommand(cmdKey, false, cmdVal)
}

function updatePellInput(html, textarea) {
    textarea.innerText = html
}