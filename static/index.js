async function modelRecord({id,title, pyodideInstance}) {
    return pyodideInstance.runPythonAsync(`
        from cromulent.model import factory
        from cromulent.vocab import Painting, PrimaryName

        pt = Painting(ident="object/${id}")
        nm = PrimaryName(content="${title}")

        pt.identified_by = nm
        factory.toJSON(pt)
    `)
}

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
            let id = results.data.id
            let title = results.data.title ?? ""

            // FIXME: pass these as variables instead of injecting :)
            if (title.includes('"')) {
                title = title.replace(/\"/g,'\\\"')
            }

            pyo.runPythonAsync(`
                from cromulent.model import factory
                from cromulent.vocab import Painting, PrimaryName

                pt = Painting(ident="object/${id}")
                nm = PrimaryName(content="${title}")

                pt.identified_by = nm
                factory.toString(pt)
            `).then( result => {
                let el = document.getElementById("py-results-code")
                el.innerHTML = el.innerHTML + result

                console.log(result)    
            }).catch( err => {
                console.error(err)
            })

            // await modelRecord({id, title, pyodideInstance: pyodide})
            console.log(results.data)
            
        }

        Papa.parse(file,{header: true, step: stepCallback, worker: false})
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
                            parseCSVFile(file,pyo)
                        }
                    })
                } else {
                    [...ev.dataTransfer.files].forEach((file,i) => {
                        parseCSVFile(file,pyo)
                    })
                }

            }
        }

        function dragOverHandler(ev) {
            // Just no-ops the browser drop handler (which would attempt to load the doc)
            ev.preventDefault()
        }

        function setupDropHandlers(pyodide) {
            let el = document.getElementById("csv-records-drop-zone")
            el.ondrop = dropHandler(pyodide)
            el.ondragover = dragOverHandler
        }

        setupDropHandlers()

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
