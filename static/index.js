async function run() {
    let pyodide = await loadPyodide()

    await pyodide.loadPackage("micropip")
    micropip = pyodide.pyimport("micropip")
    await micropip.install("./cromulent-0.16.11-py3-none-any.whl")
    return pyodide.runPythonAsync(`
    from cromulent.model import factory
    from cromulent.vocab import Painting, PrimaryName

    pt = Painting(ident="object/1")
    nm = PrimaryName(content="A Nice Painting")

    pt.identified_by = nm

    factory.toString(pt)
    `);
}

run().then((result) => {
    console.debug("Running python")
    console.log(result)
    console.debug("Done running python")
});