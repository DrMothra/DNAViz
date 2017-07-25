/**
 * Created by DrTone on 04/07/2017.
 */

/*
 * Copyright (C) 2015-2017 Marco Pasi <mf.pasi@gmail.com>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 */

/**** PDIView
 * version 0.1
 ****/

/**** Changelog
 * v0.1		First draft
 ****/

/**** TODO
 * color unused DNA gray/transparent?
 * get "initial" orientation at the end of initial tranformations (catch some event? wait some time?)
 * fix rotateCamera* methods with new viewerControls
 * - remove Safari Hack for image download when Safari supports download file name setting (see webkit bug 102914).
 * look AT interactions, ideally from the interaction groove
 */


/* GLOBAL SETTINGS */
var AWF = 0.3,                  // radius for Axis
    BWF = 0.3,                  // radius for Backbone
    GWF = 0.3,                  // radius for Grooves
    CWF = 0.3;                  // radius for Curvature vectors
var Aco = "midnightblue",
    Bco = "darkred",
    Cco = Aco,
    Gcos= ["mediumvioletred","darkorange","pink","silver"],
    Ncw = "gray",
    Ncs = "khaki",
    Nso = 0.5, // opacity
    Pcc = "steelblue",
    Pcs = "skyblue",
    Pco = 0.5,
    Pso = 0.5; // opacity
var BGCOLORS =["lightgray","white","black","powderblue"];
// NDB colors
var lowsaturation = //RGBYC
    [0xE6BEBE, 0xBEE6BE, 0xBEBEE6, 0xE6E6AA, 0xBEE6E6];
var higsaturation = //RGBYC
    [0xFF7070, 0xA0FFA0, 0xA0A0FF, 0xFFFF70, 0x70FFFF];
var logos = //RGBYC
    [0x00720D, 0xFFCB00, 0x2AB400, 0xFF9200, 0x70FFFF]
var rgbyc = logos;
var NDBColors = NGL.ColormakerRegistry.addSelectionScheme( [ // A red, T blue, C yellow, G green, and U cyan.
    [rgbyc[0],"DA or A"],
    [rgbyc[1],"DG or G"],
    [rgbyc[2],"DT"],
    [rgbyc[3],"DC or C"],
    [rgbyc[4],"U"],
    ["gray","*"]
]);

var DEBUG = false;

/* GLOBALS */
var stage, repdata, dna_axis, orientation, zoom;
var reference_orientation_component = null;

$(document).ready(function(e){
    create_GUI();
    ngl_viewer("data/output_X.pdb",
        "data/output_B.pdb",
        "data/output_R.pdb",
        "data/output.pdb",
        "data/pairings.dat",
        "data/interactions.dat",
        "data/sequence.dat");
});

function create_GUI() {
    //Create GUI - controlKit
    window.addEventListener('load', () => {
        let appearanceConfig = {
            Back: '#000000'
        };

        let controlKit = new ControlKit();

        controlKit.addPanel({width: 200})
            .addGroup({label: "Appearance", enable: false})
            .addColor(appearanceConfig, "Back", {
                colorMode: "hex", onChange: () => {
                    onBackgroundColourChanged(appearanceConfig.Back);
                }
            })
    });
}

function onBackgroundColourChanged(colour) {
    stage.setParameters( {backgroundColor: colour} );
}
/*************************
 * Create the viewer
 */
function ngl_viewer(AXPATH, BBPATH, CRPATH, PDBPATH, PPATH, IPATH, SPATH) {
    repdata = {};
    stage = new NGL.Stage("viewport",
        {"cameraType": "perspective",
            "backgroundColor": "black"});

    stage.signals.hovered.add(function(d){
        var msg = getPickingMessage( d, "" );
        $("#tooltip").html(msg);
    });

    // Create RepresentationGroups for the input PDB
    var pdbRG = stage.loadFile(PDBPATH)
        .then(function(c) {
            var some = do_input(c);
            //DEBUG
            //$.extend(some, do_interactions(c, PPATH, IPATH, SPATH));//NEW
            return some;
        }, error);
    var axRG, bbRG, crRG;
    // Define dummy axis if we lack one
    if(AXPATH != "") {
        // Create RepresentationGroups for the axis PDB
        axRG = stage.loadFile(AXPATH)
            .then(function(c) {
                // Get Axis approximate axis
                reference_orientation_component = c;
                return c;})
            .then(do_ax, error);
    } else {
        pdbRG.then(function(rg) {
            reference_orientation_component = rg["Nucleic Acid"].component;
            return rg;});
    }
    if(BBPATH != "") {
        // Create RepresentationGroups for the backbone PDB
        bbRG = stage.loadFile(BBPATH).then(do_bb, error);
    }
    // if(CRPATH != "") {
    //     // Create RepresentationGroups for the curvature PDB
    //     crRG = stage.loadFile(CRPATH).then(do_cr, error);
    // }

    // Wall: resolve all RepresentationGroups
    Promise.all([pdbRG, axRG, bbRG, crRG]).then(function(RG) {
        // Set initial orientation and zoom
        reference_orientation_component.autoView();
        // Aggregate RepresentationGroups in repdata
        RG.forEach(function(rep) {$.extend(repdata, rep);});
        return repdata;
    }).then(
        // Write GUI for RepresentationGroups
        // in specific containers, in a specific order.
        function(RGdata) {
            var lc = $("#"+"lcontrols");
            if(RGdata["Nucleic Acid"])
                //DEBUG
                //lc.append(RGdata["Nucleic Acid"].GUI("nadisplay", true));
                RGdata["Nucleic Acid"].GUI("nadisplay", true);
            if(RGdata["Axis"])
                lc.append(RGdata["Axis"].GUI("axdisplay", true));
            if(RGdata["Backbone"])
                lc.append(RGdata["Backbone"].GUI("bbdisplay", true));
            if(RGdata["MinorGroove"])
                lc.append(RGdata["MinorGroove"].GUI("gr1display", false));
            if(RGdata["MajorGroove"])
                lc.append(RGdata["MajorGroove"].GUI("gr2display", false));
            if(RGdata["Curvature"])
                lc.append(RGdata["Curvature"].GUI("crdisplay", true));

            var rc = $("#"+"rcontrols");
            if(RGdata["Protein"])
                rc.append(RGdata["Protein"].GUI("prodisplay", true));
        });

    window.addEventListener(
        "resize", function( event ){
            stage.handleResize();
        }, false
    );


}

function safariw(data, target) {
    var url = URL.createObjectURL( data );
    target.location.href = url;
}

getPickingMessage = function( d, prefix ){
    var msg;
    if( d.atom ){
        msg = d.atom.qualifiedName();
    }else if( d.bond ){
        msg = d.bond.atom1.qualifiedName();
    }else{
        msg = "Hover on atoms for details.";
    }
    return prefix ? prefix + " " + msg : msg;
};

/*************************
 * Representation callbacks
 *
 * Configure representations here.
 * Each method creates a dictionary of RepresentationGroups, one
 * for each selection relevant for the specified component.
 * These are subsequently aggregated and used to design GUI.
 *
 */
function do_input(comp) {
    //Add some custom shapes
    /*
    let shape = new NGL.Shape( "shape" );
    shape.addCone([0, 2, 7], [0, 3, 3], [1, 1, 0], 1.5);
    let shapeComp = stage.addComponentFromObject(shape);
    shapeComp.addRepresentation("cone");
    */
    return {
        // Nucleic
        "Nucleic Acid":
            new MutuallyExclusiveRepresentationGroup(comp, "Nucleic Acid", "nucleic")
                .addRepresentation( "Wire",
                    comp.addRepresentation( "base",   {"colorScheme": NDBColors}))
                .addRepresentation( "Element",
                    comp.addRepresentation( "ball+stick", {"colorScheme": "element"}))
                .addRepresentation( "Surface",
                    comp.addRepresentation( "surface",    {"opacity": Nso,
                        "colorScheme": "uniform",
                        "colorValue":  Ncs})),
        // Protein
        "Protein":
            new MutuallyExclusiveRepresentationGroup(comp, "Protein", "protein")
                .addRepresentation( "Cartoon",
                    comp.addRepresentation( "cartoon",  {"colorScheme":   "uniform",
                        "colorValue":    Pcc,
                        "opacity":       Pco}))
                .addRepresentation( "Wire",
                    comp.addRepresentation( "licorice", {"colorScheme":  "element"}))
                .addRepresentation( "Surface",
                    comp.addRepresentation( "surface",  {"opacity": Pso,
                        "colorScheme": "uniform",
                        "colorValue":  Pcs}))
    };
}

function do_ax(comp) {
    return {
        "Axis":
            new MutuallyExclusiveRepresentationGroup(comp, "Axis", null)
                .addRepresentation( null,
                    comp.addRepresentation( "licorice", {"colorScheme": "uniform",
                        "colorValue":  Aco,
                        "radius":      AWF}))
    };
}

function do_bb(comp) {
    return {
        "Backbone":
            new MutuallyExclusiveRepresentationGroup(comp, "Backbone", "(:A or :B)")
                .addRepresentation(null,
                    comp.addRepresentation( "licorice", {"colorScheme": "uniform",
                        "colorValue":  Bco,
                        "radius":      BWF})),
        "MinorGroove":
            new MutuallyExclusiveRepresentationGroup(comp, "MinorGroove", ":C")
                .addRepresentation(null,
                    comp.addRepresentation( "licorice", {"colorScheme": "uniform",
                        "colorValue":  Gcos[0],
                        "radius":      GWF})),
        "MajorGroove":
            new MutuallyExclusiveRepresentationGroup(comp, "MajorGroove", ":D")
                .addRepresentation(null,
                    comp.addRepresentation( "licorice", {"colorScheme": "uniform",
                        "colorValue":  Gcos[1],
                        "radius":      GWF})),
    };
}

function do_cr(comp) {
    return {
        "Curvature":
            new MutuallyExclusiveRepresentationGroup(comp, "Curvature", null)
                .addRepresentation(null,
                    comp.addRepresentation( "licorice", {"colorScheme": "uniform",
                        "colorValue":  Cco,
                        "radius":      CWF}))
    };
}

/*************************
 *
 */
function read_file(fname, parser, done) {
    $.get(fname).done(function(data) {
        done(parser(data));
    });
}

function parse_pairings(data) {
    var pairings = {};
    var lines = data.split('\n');
    for (var i=0; i<lines.length-1; i++) {
        // resi1 resi2
        var values = lines[i].split('\t');
        pairings[values[1]] = values[0];
    }
    return pairings;
}

function invert_hash(hash) {
    var _hash = {};
    for (var key in hash)
        if (hash.hasOwnProperty(key))
            _hash[hash[key]] = key;
    return _hash;
}

function parse_interactions(data, pairings) {
    var interactions = {};
    var lines = data.split('\n');
    for (var i=0; i<lines.length-1; i++) {
        // resi1 chain1 resn1 atom1 resi2 chain2 resn2 atom2 ?H
        var values = lines[i].split('\t');
        var key = values[0]+":"+values[1];
        if(key in pairings)
            key = pairings[key];
        if(!(key in interactions))
            interactions[key] = [];
        interactions[key].push(values);
    }
    return interactions;
}

function parse_sequence(data) {
    var sequence = [];
    var lines = data.split('\n');
    for (var i=0; i<lines.length-1; i++) {
        // resn1 resn2
        var values = lines[i].split('\t');
        sequence.push(values);
    }
    return sequence;
}

function vertical_sequence(sequence, group) {
    var c = $("<ol/>")
    sequence.forEach(function(basepair, i) {
        c.append($("<li/>").append(
            $("<a/>").click(function(e) {
                group.nenable(basepair[2]);
            }).append(basepair[0]+"--"+basepair[1])));
    });
    return c;
}

function _normalize(name) {
    if(name[0] == "D")
        name = name.slice(1);
    return name;
}

function horizontal_sequence(sequence, group) {
    // var c = $("<table/>")
    // var fors = $("<tr/>");
    // var lins = $("<tr/>");
    // var revs = $("<tr/>");
    // sequence.forEach(function(basepair, i) {
    //     forb = _normalize(basepair[0]);
    //     revb = _normalize(basepair[1]);

    //     fors.append($("<td/>").append(
    //         $("<a/>").click(function(e) {
    //             group.nenable(basepair[2]);
    //         }).append(forb)));

    //     revs.append($("<td/>").append(
    //         $("<a/>").click(function(e) {
    //             group.nenable(basepair[2]);
    //         }).append(revb)));

    //     lins.append($("<td/>").append(
    //         $("<a/>").click(function(e) {
    //             group.nenable(basepair[2]);
    //         }).append("|")));
    // });
    // c.append(fors);
    // c.append(lins);
    // c.append(revs);
    // return c;
    var a = $("<div/>");
    var b = $("<table/>")
    var c = $("<tr/>");
    c.append($("<th/>", {"class":"seq_initial"})
        .append("5'-<br/><br/>3'-"));
    sequence.forEach(function(basepair, i) {
        forb = _normalize(basepair[0]);
        revb = _normalize(basepair[1]);
        c.append($("<td/>")
            .click(function(e) {
                var tname = basepair[2];
                $(this).parent().children().each(function(i, td) {
                    $(td).toggleClass('active', false);
                });
                if(group.enabled >= 0 && group.reprList[group.enabled].name == tname) {
                    group.enable(-1);
                }else{
                    group.nenable(tname);
                    $(this).toggleClass('active');
                }
            })
            .append(forb+"<br/>|<br/>"+revb));
    });
    c.append($("<th/>", {"class":"seq_final"})
        .append("-3'<br/><br/>-5'"));
    b.append(c);
    // b.append($("<span/>")
    //         .click(function(e){
    //             group.enable(-1);
    //         }).append($("<a/>").append("hide")));
    a.append(b);
    return a;
}

function do_interactions(comp, pairings_file, interactions_file, sequence_file) {
    var group = new MutuallyExclusiveRepresentationGroup(comp, "Interactions", null);

    read_file(pairings_file, parse_pairings, function(pairings) {
        read_file(interactions_file, function(data) {
            return parse_interactions(data, pairings);
        }, function(interactions) {
            var rev_pairings = invert_hash(pairings);
            for(var res1 in interactions) {
                // resi1 chain1 resn1 atom1 resi2 chain2 resn2 atom2 ?H
                var allresidues = interactions[res1].map(function(values){
                    return values[4]+":"+values[5];
                });
                allresidues.push(res1);
                if(res1 in rev_pairings)
                    allresidues.push(rev_pairings[res1]);
                var interactiongroup = new InteractionGroup(
                    comp, res1, "("+allresidues.join(" or ")+")")
                    .addRepresentation( "Ball&Stick",
                        comp.addRepresentation( "ball+stick", {"colorScheme": "element",
                            "colorValue":  "#006b8f"}));
                interactions[res1].forEach(function(values) {
                    interactiongroup.addInteraction(
                        values[0]+":"+values[1]+"."+values[3],
                        values[4]+":"+values[5]+"."+values[7],
                        hydrophobic = values[8] == "H");
                });
                group.addRepresentation(res1, interactiongroup)
            }
        });
    });

    /* Hack in some GUI */
    read_file(sequence_file, parse_sequence, function(sequence) {
        // var c = vertical_sequence(sequence, group);
        var c = horizontal_sequence(sequence, group);
        $("#sequence").append(c);
    });
    group.toggle(true);
    return {"Interactions": group};
}


/*************************
 * Interaction representation group API
 */
function _autoView(component, sele, duration) {
    component.stage.animationControls.zoomMove(
        component.getCenter( sele ),
        component.getZoom( sele ) * 0.5,
        duration
    );
}
var InteractionGroup = function(component, name, selection, representations,
                                defaultParameters) {
    RepresentationGroup.call(this, component, name, selection, representations, defaultParameters);
};
InteractionGroup.prototype = Object.create(RepresentationGroup.prototype);

InteractionGroup.prototype.setVisibility = function(what) {
    // Show/Hide all representations in group, and focus/zoom
    this.reprList.forEach(function(repr) {
        repr.setVisibility(what);
    });
    if(what) {
        _autoView(this.component, this.selection, 1000);
        // var axis = get_axis(repr.repr.structure);
        // rotateCameraTo(axis);
        // rotateCameraAxisAngle(cc(new NGL.Vector3(1,0,0)), -Math.PI/2)
    }
}

InteractionGroup.prototype.all_empty = function() {};
InteractionGroup.prototype.GUI = function() {};
InteractionGroup.prototype.addInteraction = function(atom1, atom2, hydrophobic) {
    /*
     * Add an interaction to this group.
     */
    hydrophobic = typeof hydrophobic === 'undefined' ? false : hydrophobic;
    var parameters = {
        atomPair: [[atom1, atom2]],
        labelColor: "black",
        color: "blue",
        opacity: 0.5,
        scale: 0.25,
        labelUnit: "angstrom",
        labelSize: 0.75
    };
    if(hydrophobic) {
        parameters["labelSize"] = 0;
        parameters["color"] = "green";
    }
    this.addRepresentation( "distance",
        this.component.addRepresentation(
            "distance", parameters));
    return this;
}

/*************************
 * Promise functions
 */
function error(err) {
    console.log(err);
}

/*************************
 * Utilities
 */
function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function get_axis(structure) {
    var atoms = structure.atomStore,
        n = atoms.count-1,
        x = atoms.x[0] - atoms.x[n],
        y = atoms.y[0] - atoms.y[n],
        z = atoms.z[0] - atoms.z[n];
    return new NGL.Vector3(x,y,z).normalize();
}

