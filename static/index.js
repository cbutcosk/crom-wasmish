document.addEventListener("DOMContentLoaded",() => {

    async function setupPyodideAndCrom() {

        const pyodide = await loadPyodide()
        await pyodide.loadPackage("micropip")

        micropip = pyodide.pyimport("micropip")
        micropip.install("./dist/cromulent-0.16.11-py3-none-any.whl")
            
        return pyodide
    }

    async function parseCSVFile(file,pyo) {        
        let stepCallback = (results, parser) => {
            id = results.data.id
            title = results.data.title ?? ""

            // FIXME: pass these as variables instead of injecting :)
            if (title.includes('"')) {
                title = title.replace(/\"/g,'\\\"')
            }

            pyo.runPythonAsync(`
                from js import id, title
                from cromulent.model import factory
                from cromulent.vocab import Painting, PrimaryName

                pt = Painting(ident=f"object/{id}")
                nm = PrimaryName(content=f"{title}")

                pt.identified_by = nm
                factory.toString(pt)
            `).then( result => {
                let resultsUl = document.getElementById("py-results-code")
                let resultLi = document.createElement("li")
                let codeFence = document.createElement("code")
                codeFence.innerHTML = result

                resultLi.append(codeFence)
                resultsUl.append(resultLi)

            }).catch( err => {
                console.error(err)
            })
            
        }

        Papa.parse(file,{header: true, step: stepCallback, worker: false, download: (typeof file) === "string" ? "true" : "false" })

    }

    async function run() {
        
        const pyo = await setupPyodideAndCrom()

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

    async function testRunCrom(pyo) {
        // Really just a test rig, probably don't need this
        // return pyo.runPythonAsync(`
        //     import json
        //     from cromulent.model import factory
        //     from cromulent.vocab import Painting, PrimaryName

        //     pt = Painting(ident="object/1")
        //     nm = PrimaryName(content="A Nice Painting")

        //     pt.identified_by = nm

        //     data = factory.toJSON(pt)
        //     json.dumps(data,indent=2)
        // `);


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
