function clearElementChildrenById(elementId) {
    let el = document.getElementById(elementId)
    
    if (el) {
        while (el.firstChild) {
            el.removeChild(el.firstChild)
        }
    }        
}

document.addEventListener("DOMContentLoaded",() => {

    async function setupPyodideAndCrom() {

        const pyodide = await loadPyodide()
        await pyodide.loadPackage("micropip")

        micropip = pyodide.pyimport("micropip")
        micropip.install("./dist/cromulent-0.16.11-py3-none-any.whl")
            
        return pyodide
    }

    function removeLoading() {
        let loadingModal = document.getElementById('python-loading-modal')
        loadingModal.classList.remove('is-active')
    }

    async function parseCSVFile(file,pyo) {   

        let recordTransformEl = document.getElementById('csv-record-to-json-ld-transform')     
        let transform = recordTransformEl.innerHTML

        clearElementChildrenById('py-results-code')
        clearElementChildrenById('csv-records-rows')

        let stepCallback = (results, parser) => {

            ((results) => { 
                // FIXME: Check if this spread assignment is necessary, was fighting variable captures during dev
                record = {...results.data}

                let result = pyo.runPython(transform)

                let resultsUl = document.getElementById("py-results-code")
                let resultLi = document.createElement("li")
                let codeFence = document.createElement("code")
                codeFence.innerHTML = result

                resultLi.append(codeFence)
                resultsUl.append(resultLi)

                let recordsUl = document.getElementById("csv-records-rows")
                let recordLi = document.createElement("li")
                recordLi.innerHTML = JSON.stringify(record)

                recordsUl.append(recordLi)
               
            })(results)
            
        }

        Papa.parse(file,{header: true, step: stepCallback, worker: false, download: (typeof file) === "string" ? "true" : "false" })

    }

    async function run() {
        
        // FIXME: This changes the code inside the py transform area
        // Check the hljs docs to see how the recommend styling on editable textareas (or equiv)
        // hljs.highlightAll()
        const pyo = await setupPyodideAndCrom()
        if (pyo) {
            removeLoading()
        }

        function fileChooseHandler(pyodide) {
            return (ev) => {
                // Parse the payload -- almost shot for shot this: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop
                ev.preventDefault()
                if (ev.target.files.length === 0) {
                    return
                }

                [...ev.target.files].forEach((file,i) => {
                    parseCSVFile(file,pyodide)
                })
            }
        }

        function dropHandler(pyodide) {
            return (ev) => {
                // Parse the payload -- almost shot for shot this: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop
                ev.preventDefault()

                if (ev.dataTransfer.items) {
                    [...ev.dataTransfer.items].forEach((item,i) => {
                        if (item.kind === "file") {
                            const file = item.getAsFile();
                            parseCSVFile(file,pyodide)
                        }
                    })
                } else {
                    [...ev.dataTransfer.files].forEach((file,i) => {
                        parseCSVFile(file,pyodide)
                    })
                }

            }
        }

        function dragOverHandler(ev) {
            // Just no-ops the browser drop handler (which would attempt to load the doc)
            ev.preventDefault()
        }

        function sampleCSVHandler(pyo) {
            return (ev) => {
                ev.preventDefault()
                ev.stopPropagation()
                parseCSVFile(ev.target.href,pyo)
            }
        }

        function tabActive(elementId) {
            let el = document.getElementById(elementId)
            let tab = el.closest('li')
            let target = document.getElementById(tab.dataset.target)

            if (tab) {
                let allTabs = tab.parentNode.children || []
                for ( const t of allTabs) {
                    t.classList.remove('is-active')
                    let tPanel = document.getElementById(t.dataset.target)
                    tPanel.classList.add('is-hidden')
                }
                tab.classList.add('is-active')
                target.classList.remove('is-hidden')
            }
        }

        function setupHandlers(pyodide) {
            let recordTab = document.getElementById('records-tab-button')
            recordTab.onclick = () => { tabActive('records-tab-button') }

            let transformTab = document.getElementById('transform-tab-button')
            transformTab.onclick = () => { tabActive('transform-tab-button') }

            let aboutTab = document.getElementById('about-tab-button')
            aboutTab.onclick = () => { tabActive('about-tab-button') }

            let el = document.getElementById("csv-records-drop-zone")
            el.ondrop = dropHandler(pyodide)
            el.ondragover = dragOverHandler

            let fileInput = document.getElementById('csv-file-chooser')
            fileInput.onchange = fileChooseHandler(pyodide)

            let sampleEl = document.getElementById("csv-records-use-sample")
            sampleEl.onclick = sampleCSVHandler(pyodide)
        }

        setupHandlers(pyo)

    }

    function testSqlite3() {
        // Initialize Sqlite and create a DB
        self.sqlite3InitModule({}).then((sqlite3) => {
            const oo = sqlite3.oo1
            const db = new oo.DB("/mydb.sqlite3",'ct');
            console.debug("Sqlite3 initialized")
        })

    }

    run().then((result) => {
        console.debug("Done")
    });


})
