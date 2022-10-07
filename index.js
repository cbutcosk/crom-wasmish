const {loadPyodide} = require("pyodide");

async function run() {
    let pyodide = await loadPyodide()

    await pyodide.loadPackage("micropip")
    return pyodide.runPythonAsync(`
    import micropip
    await micropip.install("file:///XXX/dist/cromulent-0.16.11-py3-none-any.whl")
    
    from cromulent.model import factory
    from cromulent.vocab import Painting, PrimaryName

    pt = Painting(ident="object/1")
    nm = PrimaryName(content="A Nice Painting")

    pt.identified_by = nm
    factory.toString(pt)
    `);
}

run().then((result) => {
    console.log(result)
});