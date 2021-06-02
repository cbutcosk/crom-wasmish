from iiif_model import *


m = Manifest(label={"en": "Test Manifest"})
m.summary = {'en': "Description of the thing"}
me = MetadataEntry(ident="")
me.label = "label"
me.value = "value"
m.metadata = me
tn = Image(ident="http://example.com/images/1.jpg")
m.thumbnail = tn
rs = MetadataEntry(ident="")
rs.label = "required"
rs.value = {"en": ["stmt", "stmt2"]}
m.requiredStatement = rs
m.rights = RightsStatement(ident="https://creativecommons.org/cc-by/4.0/")
who = Agent(ident="https://linked-data.yalespace.edu/people/rob")
who.label = "Rob"
hp =Text(ident="https://yale.edu/people/rob/index.html")
hp.format = "text/html"
hp.language = "en" # ------- this stays singular because it's a literal that isn't langString
who.homepage = hp
m.provider = who
ds = Dataset(ident="https://linked-data.yalespace.edu/people/rob/index.jsonld")
ds.profile = Standard(ident="https://linked.art/ns/v1/context.json")
who.seeAlso = ds

logo = Image(ident="https://linked-data.yalespace.edu/people/rob/logo.png")
logo.height = 100
logo.width = 100
logo.format = "image/png"
who.logo = logo
m.navDate = "2021-06-01T00:00:00Z"

rndr = Video(ident="http://youtube.com/video/1")
rndr.duration = 10.0
m.rendering = rndr

ss = SearchService1(ident="http://example.org/iiif/search/1")
ss.label="Rob's Search Service"
m.service = ss

coll = Collection(label="Test Collection")
m.partOf = coll

pc = Canvas(label="Placeholder")
pc.height = 1000
pc.width = 1000
pc.duration = 10.6
m.placeholderCanvas = pc

strt = Canvas(ident="http://example.org/iiif/canvas/1", label="startCanvas")
m.start = strt

rng = Range()
ac1 = AnnotationCollection(label="supplementary annos")
rng.supplementary = ac1
m.structures = rng
rng2 = Range()
rng.items = rng2

cvs = Canvas()
rng.items = cvs
cvs.height = 1000
cvs.width = 800
cvs.label = {"en": "Test Canvas"}
m.items = cvs
pg = AnnotationPage()
cvs.items = pg
pg2 = AnnotationPage()
cvs.annotations = pg2

anno = Annotation()
pg.items = anno




print(factory.toString(m, compact=False))
print('---')
print(factory.toRDF(m, format="ttl"))

