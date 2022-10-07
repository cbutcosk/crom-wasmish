
from __future__ import unicode_literals

import os
import sys
import re

from pyld import jsonld
from rdflib import ConjunctiveGraph

from model import CromulentFactory

KEY_ORDER_DEFAULT = 10000
LINKED_ART_CONTEXT_URI = "https://linked.art/ns/v1/linked-art.json"

pyld_proc = jsonld.JsonLdProcessor()
min_context = {
	"crm": "http://www.cidoc-crm.org/cidoc-crm/",
    "sci": "http://www.ics.forth.gr/isl/CRMsci/",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "dc": "http://purl.org/dc/elements/1.1/",
    "dcterms": "http://purl.org/dc/terms/",
    "schema": "http://schema.org/",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "foaf": "http://xmlns.com/foaf/0.1/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "dig": "http://www.ics.forth.gr/isl/CRMdig/",
    "la": "https://linked.art/ns/terms/",
    "id": "@id",
    "type": "@type"
}
re_bnodes = re.compile("^_:b([0-9]+) ", re.M)
re_bnodeo = re.compile("> _:b([0-9]+) <", re.M)
re_quad = re.compile(" <[^<]+?> .$", re.M)		

class CromulentRDFFactory(CromulentFactory):

	def toRDF(self, what, format="nq", bnode_prefix=""):
		# Format can be:  xml, pretty-xml, turtle, n3, nt, trix, trig, nquads
		# ttl = turtle; nq, n-quads == nquads

		# Need to ensure we generate the full form of predicates
		# otherwise context processing takes AGES
		# So set serializer to normal, and full_names to True
		srlz = self.json_serializer
		fn = self.full_names
		self.json_serializer = "normal"
		self.full_names = True
		js  = self.toJSON(what)
		# And put them back
		self.json_serializer = srlz
		self.full_names = fn

		# Substitute in a minimal context that defines only prefixes
		js['@context'] = min_context
		src = {'@id': js['@id'], '@graph':js}
		data = pyld_proc.to_rdf(src, options={"format": "application/nquads"})

		# Here replace all the bnodes with a unique id
		# This works so long as PyLD continues with incrementing integer bnode ids
		if bnode_prefix:
			data = re_bnodes.subn("_:b{bnode_prefix}_\\1 ".format(bnode_prefix=bnode_prefix), data)[0]
			data = re_bnodeo.subn("> _:b{bnode_prefix}_\\1 <".format(bnode_prefix=bnode_prefix), data)[0]				

		if format in ['nq', 'nquads', 'n-quads', 'application/nquads']:
			return data
		elif format in ['nt', 'ntriples', 'n-triples', 'application/ntriples']:
			data = re_quad.subn(" .", data)[0]
			return data
		else:
			# Need to pass over to rdflib
			g = ConjunctiveGraph()
			for (k,v) in min_context.items():
				if v[0] != "@":
					g.bind(k, v)
			g.parse(data=data, format="nquads")
			out = g.serialize(format=format)
			if type(out) == bytes:
				return out.decode('utf-8')
			else:
				return out