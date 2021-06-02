from lxml import etree
import codecs
import json
import sys

PROFILE_ONLY = '--profile' in sys.argv
default_key_order = 10000

NS = {'rdf':"http://www.w3.org/1999/02/22-rdf-syntax-ns#",
	'xsd':"http://www.w3.org/2001/XMLSchema#",
	'rdfs':"http://www.w3.org/2000/01/rdf-schema#",
	'dcterms':"http://purl.org/dc/terms/",
	'owl':"http://www.w3.org/2002/07/owl#",
	'xml': "http://www.w3.org/XML/1998/namespace",
	"skos": "http://www.w3.org/2004/02/skos/core#",
	"schema": "http://schema.org/",
	"dc": "http://purl.org/dc/elements/1.1/",
  	"oa": "http://www.w3.org/ns/oa#",
  	"prezi": "http://iiif.io/api/presentation/3#",
  	"as": "http://www.w3.org/ns/activitystreams#",
  	"exif": "http://www.w3.org/2003/12/exif/ns#",
  	"ebu": "http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#",
  	"dctypes": "http://purl.org/dc/dcmitype/"
}


key_order_hash = {}
class_overrides = {"as:OrderedCollection": "AnnotationCollection", "as:OrderedCollectionPage":"AnnotationPage",
	"dctypes:MovingImage": "Video", "dctypes:StillImage": "Image", "schema:WebAPI": "Service", 
	"dctypes:Sound": "Audio", "http://iiif.io/api/image/1#ImageService": "ImageService1",
	"http://iiif.io/api/image/2#ImageService": "ImageService2",
	"http://iiif.io/api/image/3#ImageService": "ImageService3",
	"http://iiif.io/api/search/1#SearchService": "SearchService1"
}
property_overrides = {"metadataEntries": "metadata", "navigationDate": "navDate", "dcterms:conformsTo": "profile",
	"dcterms:hasFormat": "rendering", "schema:potentialAction": "service", 'dcterms:part_of': 'partOf'}

profile_flags = {'exif:height': [1,0], 'exif:width':[1,0], 'ebu:duration':[1,0], 'dc:format':[1,0], 
	'requiredStatement':[1,0], 'navigationDate':[1,0], 'timeMode':[1,0]}
stuff = []
propXHash = {}
classXHash = {}

def process_classes(dom):
	classes = dom.xpath("//rdfs:Class", namespaces=NS)
	for c in classes:
		name = c.xpath('@rdf:about', namespaces=NS)[0]
		for (pref,ns) in NS.items():
			if name.startswith(ns):
				name = name.replace(ns, "%s:" % pref)
				break

		useflag = str(profile_flags.get(name, 1))
		if name in classXHash:
			classXHash[name][0] = c
		else:
			classXHash[name] = [c, useflag]

		label = c.xpath('./rdfs:label[@xml:lang="en"]/text()', namespaces=NS)
		if not label:
			label = c.xpath('./rdfs:label/text()', namespaces=NS)
		label = label[0]
		try:
			comment = c.xpath('./rdfs:comment/text()', namespaces=NS)[0]
			comment = comment.strip()
			comment = comment.replace('\n', '\\n').replace('\t', ' ')
		except:
			comment = ""

		subClsL = c.xpath('./rdfs:subClassOf/@rdf:resource', namespaces=NS)
		if subClsL:
			# could be multiples
			subCls = '|'.join(subClsL)
			for s in subClsL:
				try:
					classXHash[s][1] = 3
				except KeyError:
					classXHash[s] = [None, 3]
		else:
			subCls = ""


		if name in class_overrides:
			ccname = class_overrides[name]
		else:
			# Assume that we've done our job okay and put in overrides for NSS
			cidx = name.find(":")
			if cidx > -1:
				ccname = name[cidx+1:]			
			else:
				uc1 = name.find("_")
				ccname = name[uc1+1:]
				ccname = ccname.replace("_or_", "_Or_").replace("_of_", "_Of_")
				ccname = ccname.replace('-', '').replace('_', '')

		stuff.append([name, "class", ccname, label, comment, subCls, useflag])

def process_props(dom):
	props = dom.xpath("//rdf:Property",namespaces=NS)
	for p in props:
		name = p.xpath('@rdf:about', namespaces=NS)[0]

		for (pref,ns) in NS.items():
			if name.startswith(ns):
				name = name.replace(ns, "%s:" % pref)
				break		

		useflags = profile_flags.get(name, [1,1]) or [1,1]
		propXHash[name] = [p, useflags[0]]

		try:
			label = p.xpath('./rdfs:label[@xml:lang="en"]/text()', namespaces=NS)[0]
		except:
			try:
				label = p.xpath('./rdfs:label/text()', namespaces=NS)[0]
			except:
				print(f"No label for {p.xpath('./@rdf:about', namespaces=NS)}")
				raise ValueError
		try:
			comment = p.xpath('./rdfs:comment/text()', namespaces=NS)[0]
			comment = comment.strip()
			comment = comment.replace('\n', '\\n').replace('\t', ' ')
		except:
			comment = ""

		domn = p.xpath('./rdfs:domain/@rdf:resource', namespaces=NS)
		if domn:		
			domn = domn[0]
			for (k,v) in NS.items():
				domn = domn.replace(v,"%s:" % k)
		else:
			domn = ""
		rang = p.xpath('./rdfs:range/@rdf:resource', namespaces=NS)
		if rang:
			rang = rang[0]
			for (k,v) in NS.items():
				rang = rang.replace(v,"%s:" % k)
		else:
			rang = ""

		subProp = p.xpath('./rdfs:subPropertyOf/@rdf:resource', namespaces=NS)
		if subProp:
			subProp = subProp[0]
		else:
			subProp = ""

		inverse = p.xpath('./owl:inverseOf/@rdf:resource', namespaces=NS)
		if inverse:
			inverse = inverse[0]
			for (pref,ns) in NS.items():
				if inverse.startswith(ns):
					inverse = inverse.replace(ns, "%s:" % pref)
					break
		else:
			inverse = ""

		cidx = name.find(":")
		if name in property_overrides:
			ccname = property_overrides[name]
		elif cidx > -1:
			ccname = name[cidx+1:]
		else:
			uc1 = name.find("_")
			pno = name[:uc1]
			if pno in property_overrides:
				ccname = property_overrides[pno]
			else:
				ccname = name[uc1+1:]
				ccname = ccname.replace("-", "")
				if ccname.startswith("is_"):
					ccname = ccname[3:]
				elif ccname.startswith("has_") or ccname.startswith("had_") or ccname.startswith("was_"):
					ccname = ccname[4:]

		koi = str(key_order_hash.get(ccname, default_key_order))

		# [0/1/2, 0/1] for [no/okay/warn, single/multiple]
		stuff.append([name, "property", ccname, label, comment, subProp, domn, rang, inverse, koi, 
			str(useflags[0]), str(useflags[1])])


files = ['iiif.xml']

for fn in files:
	print("processing: %s" % fn)
	fh = open(fn)
	data = fh.read()
	fh.close()
	try:
		dom = etree.XML(data.encode('utf-8'))
	except:
		dom = etree.XML(data)
	process_classes(dom)
	process_props(dom)


headers = ["term", "term type", "json-ld key", "label", "scope note", "subPropertyOf", "domain", \
		"range", "inverse", "key order", "okay to use?", "okay for multiple?"]

# outdata = '\n'.join(['\t'.join(x) for x in stuff])
fh = codecs.open('iiif.tsv', 'w', 'utf-8')
# write header
line = '\t'.join(headers) + '\n'
fh.write(line)

for l in stuff:
	name = l[0]
	line = '\t'.join(l) + "\n"	
	if name in classXHash:
		okay = classXHash[name][1]
	elif name in propXHash:
		okay = propXHash[name][1]
	else:
		okay = 0
		print("Could not find %s" % name)
	if not PROFILE_ONLY or okay:
		fh.write(line)
fh.close()
