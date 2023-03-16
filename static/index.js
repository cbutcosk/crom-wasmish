document.addEventListener("DOMContentLoaded",() => {

    async function setupPyodideAndCrom() {

        const pyodide = await loadPyodide()
        await pyodide.loadPackage("micropip")

        micropip = pyodide.pyimport("micropip")
        micropip.install("./dist/cromulent-0.16.11-py3-none-any.whl")
            
        return pyodide
    }

    function removeLoading() {
        let el = document.getElementById('csv-records-drop-zone')
        while (el.firstChild) {
            el.removeChild(el.firstChild)
        }

        let dropZoneText = document.createElement('p')
        dropZoneText.innerHTML = "Drop CSV file(s) of art objects or use a <a id=\"csv-records-use-sample\" href=\"./sample.csv\" download>sample CSV</a> to get started"

        el.append(dropZoneText)

    }

    async function parseCSVFile(file,pyo) {        
        let stepCallback = (results, parser) => {

            ((results) => { 

                let record = { id: results.data.id, title: results.data.title ?? "", accession: results.data.accession ?? "", date: results.data.date ?? "" }
                rec = {...record}

                let result = pyo.runPython(`
                    from js import rec
                    from cromulent.model import factory, HumanMadeObject, Production, TimeSpan, Name
                    from cromulent.vocab import Painting, PrimaryName, AccessionNumber
                    
                    rec = rec.to_py()
                    id = rec['id']
                    title = rec['title']
                    accession = rec['accession']
                    date = rec['date']

                    pt = HumanMadeObject(ident=f"object/{id}")

                    nm = PrimaryName(content=f"{title}")
                    pt.identified_by = nm

                    an = AccessionNumber(content=f"{accession}")
                    pt.identified_by = an

                    p = Production()
                    ts = TimeSpan()
                    date_label = Name(content=date)

                    ts.identified_by = date_label
                    p.timespan = ts
                    pt.produced_by = p

                    factory.toString(pt)
                `)

                let resultsUl = document.getElementById("py-results-code")
                let resultLi = document.createElement("li")
                let codeFence = document.createElement("code")
                codeFence.innerHTML = result

                resultLi.append(codeFence)
                resultsUl.append(resultLi)

               
            })(results)
            
        }

        Papa.parse(file,{header: true, step: stepCallback, worker: false, download: (typeof file) === "string" ? "true" : "false" })

    }

    async function run() {
        
        const pyo = await setupPyodideAndCrom()
        if (pyo) {
            removeLoading()
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

        function setupDropHandlers(pyodide) {
            let el = document.getElementById("csv-records-drop-zone")
            el.ondrop = dropHandler(pyodide)
            el.ondragover = dragOverHandler

            let sampleEl = document.getElementById("csv-records-use-sample")
            sampleEl.onclick = sampleCSVHandler(pyodide)
        }

        setupDropHandlers(pyo)

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
