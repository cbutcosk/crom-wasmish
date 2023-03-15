document.addEventListener("DOMContentLoaded",() => {

    async function run() {
        let pyodide = await loadPyodide()

        await pyodide.loadPackage("micropip")
        micropip = pyodide.pyimport("micropip")
        await micropip.install("./dist/cromulent-0.16.11-py3-none-any.whl")
        return pyodide.runPythonAsync(`
        import json
        from cromulent.model import factory
        from cromulent.vocab import Painting, PrimaryName

        pt = Painting(ident="object/1")
        nm = PrimaryName(content="A Nice Painting")

        pt.identified_by = nm

        data = factory.toJSON(pt)
        json.dumps(data,indent=2)
        `);
    }

    run().then((result) => {
        let headerEl = document.getElementById("py-env-status")
        headerEl.innerHTML = "linked.art JSON-LD generated in-browser"

        let el = document.getElementById("py-results-code")
        el.innerHTML = result
        // console.debug("Running python")
        console.log(typeof result)
        console.debug("Done running python")
    });

})
