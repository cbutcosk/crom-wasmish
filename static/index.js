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

    function doneParsing() {
        let downloadJson = document.getElementById('download-json-button')
        let downloadSql = document.getElementById('download-sqlite-button')

        downloadJson.removeAttribute('disabled')
        downloadSql.removeAttribute('disabled')

    }
    async function parseCSVFile(file,pyo,display=true) {   

        let recordTransformEl = document.getElementById('csv-record-to-json-ld-transform')     
        let transform = recordTransformEl.innerHTML

        if (display) {
            clearElementChildrenById('py-results-code')
            clearElementChildrenById('csv-records-rows')            
        }

        window.jsonResults = []
        window.recordResults = []

        let step = (results, parser) => {

            // IIFE so vars can escape capture
            ((results) => { 
                // FIXME: Check if this spread assignment is necessary, was fighting variable captures during dev
                record = {...results.data}

                let result = pyo.runPython(transform)

                if (display) {
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
                }

                window.jsonResults.push(result)
                window.recordResults.push(JSON.stringify(record))

            })(results)
            
        }

        let complete = (results,parser) => {
            doneParsing()
        }

        Papa.parse(file,{header: true, step, complete, worker: false, download: (typeof file) === "string" ? "true" : "false" })

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

        function sqlite3Create() {

            return new Promise( (resolve,reject) => {
                self.sqlite3InitModule().then( (sqlite3) => {
                    console.log("Done sqlite3 init")
                    oo = sqlite3.oo1
                    const db = new oo.DB()

                    try {
                        db.exec("CREATE TABLE documents(body json)")
                        db.exec("CREATE TABLE records(body json)")

                        for (const doc of window.jsonResults) {
                            db.exec({ sql:"INSERT INTO documents values (?)", bind: doc})
                        }

                        for (const rec of window.recordResults) {
                            db.exec({ sql:"INSERT INTO records values (?)", bind: rec})
                        }

                        db.exec("VACUUM")
                    } catch(e) {
                        console.error("Sqlite3 Error:",e)
                        reject(e)
                    }

                    try {
                        const byteArray = sqlite3.capi.sqlite3_js_db_export(db)
                        resolve(byteArray)
                    } catch(e) {
                        console.error("Sqlite3 Serialization Error:",e)
                        reject(e)
                    }
                })
            })

       }

        function setupHandlers(pyodide) {
            let recordTab = document.getElementById('records-tab-button')
            recordTab.onclick = () => { tabActive('records-tab-button') }

            let transformTab = document.getElementById('transform-tab-button')
            transformTab.onclick = () => { tabActive('transform-tab-button') }

            let aboutTab = document.getElementById('about-tab-button')
            aboutTab.onclick = () => { tabActive('about-tab-button') }

            let fileInput = document.getElementById('csv-file-chooser')
            fileInput.onchange = fileChooseHandler(pyodide)

            let sampleEl = document.getElementById("csv-records-use-sample")
            sampleEl.onclick = sampleCSVHandler(pyodide)

            let downloadJSONButton = document.getElementById("download-json-button")
            downloadJSONButton.onclick = () => { 

                    const data = `{ "items": [ ${window.jsonResults.join(', ')} ]`
                    const blob = new Blob([data],{type: "application/json"}) 
                    const downloadUrl = window.URL.createObjectURL(blob)
                    let a = document.createElement('a')
                    a.href = downloadUrl
                    a.download = "documents.json"
                    document.body.appendChild(a)
                    a.click()
                    URL.revokeObjectURL(downloadUrl)

            }
            // FIXME: Download this as a thing

            let downloadSQLiteButton = document.getElementById("download-sqlite-button")
            downloadSQLiteButton.onclick = () => { 

                sqlite3Create().then( bytes => {

                    const blob = new Blob([bytes.buffer],{type: "application/x-sqlite3"}) 
                    const downloadUrl = window.URL.createObjectURL(blob)
                    let a = document.createElement('a')
                    a.href = downloadUrl
                    a.download = "documents.sqlite3"
                    document.body.appendChild(a)
                    a.click()
                    URL.revokeObjectURL(downloadUrl)

                })

            }

        }

        setupHandlers(pyo)

    }

    run().then((result) => {
        console.debug("Done")
    });


})
