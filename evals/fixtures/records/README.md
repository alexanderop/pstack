# Records desk

A dependency-free Node application for browsing customer records.
Run `node src/cli.mjs list --status active --input records.json`.
Input is a JSON array of records with id, name, email, and status fields.
`--status` is optional; without it, list all records in input order.

The search controller in src/search.mjs is shared by interactive clients.
It accepts an asynchronous lookup function and an onChange callback.
Clients call search(query) and read state via getState(). Preserve this API.
A new search immediately clears the previous error and marks loading true.
Keep the previous rows while loading. Failed searches expose the error message.

CSV export should use the same filters as list, with columns id,name,email,status.
Use a header even for empty results, CRLF row endings, and standard CSV quoting.
The export command writes only CSV to stdout, so callers can redirect it to a file.
