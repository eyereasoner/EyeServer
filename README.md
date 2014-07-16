# EyeServer is a server for the EYE reasoner.

[**Reasoning**](http://n3.restdesc.org/) is the powerful mechanism to draw conclusions from facts.
The Semantic Web contains vast amounts of data,
which makes it an interesting source to use with one of several available reasoners.

[**Reasoning in your browser**](https://github.com/RubenVerborgh/EyeClient) is possible with this server, which exposes the [EYE](http://eulersharp.sourceforge.net/) N3 reasoner to the Web.

[**Bringing reasoning to the Web**](http://reasoning.restdesc.org/) is the initiative with several open source projects (such as this one) that make reasoning accessible.

## EyeServer is a counterpart to EyeClient.
[EyeClient](https://github.com/RubenVerborgh/EyeClient) is a browser widget that communicates with an EYE reasoner server to deliver reasoning results.

[![The widget (on the client) and the reasoner (on the server) interact.](http://reasoning.restdesc.org/images/reasoner-client-server.png)](http://reasoning.restdesc.org/)

## Run your own EyeServer or use a public one.
Follow the instructions below to set up your own reasoner server,
or use our public reasoner server at `http://eye.restdesc.org/`.

### Installing
EyeServer is an [npm](http://npmjs.org/) package for [node.js](http://nodejs.org/).

First of all, you need to **install the EYE reasoner** ([Windows](http://eulersharp.sourceforge.net/README.Windows) – [OS X](http://eulersharp.sourceforge.net/README.MacOSX) – [Linux](http://eulersharp.sourceforge.net/README.Linux)).

Then, **install the server package** as follows:

``` bash
$ [sudo] npm -g install eyeserver
```

### Running

``` bash
$ eyeserver 8000
```

### Using

``` bash
$ curl "http://localhost:8000/?data=http://eulersharp.sourceforge.net/2003/03swap/socrates.n3&query=http://eulersharp.sourceforge.net/2003/03swap/socratesF.n3"
```

## Learn more.

The [Bringing reasoning to the Web](http://reasoning.restdesc.org/) page explains the origins of this project and provides pointers to related resources.

This code is written by Ruben Verborgh and serves as an HTTP interface to the [EYE](http://eulersharp.sourceforge.net/) reasoner by Jos De Roo.
