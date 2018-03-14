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
    [0x00720D, 0xFFCB00, 0x2AB400, 0xFF9200, 0x70FFFF];
var rgbyc = logos;
/*
var NDBColors = NGL.ColormakerRegistry.addSelectionScheme( [ // A red, T blue, C yellow, G green, and U cyan.
    [rgbyc[0],"DA or A"],
    [rgbyc[1],"DG or G"],
    [rgbyc[2],"DT"],
    [rgbyc[3],"DC or C"],
    [rgbyc[4],"U"],
    ["gray","*"]
], "DNA_Protein");
*/
var DEBUG = false;

/* GLOBALS */
let basePairReps = ["Wire", "Element", "Surface", "Cylinder", "Smooth", "Spacefill", "Slab"];
let appearanceConfig = {
    Back: '#000000',
    BBone: '#8b0000',
    A: DNA_HEX_COLOURS.MOLECULE_A,
    G: DNA_HEX_COLOURS.MOLECULE_G,
    T: DNA_HEX_COLOURS.MOLECULE_T,
    C: DNA_HEX_COLOURS.MOLECULE_C,
    Pairs: basePairReps,
    Protein: ["Cartoon", "Wire", "Surface", "Ribbon", "Rope", "Tube"]
};

let saveConfig = {
    Back: '#000000'
};

var dna_axis, orientation, zoom;
var reference_orientation_component = null;
let NDBColors;
const DEFAULT_X_ROT = -Math.PI/4;
const DEFAULT_Y_ROT = 0;
const DEFAULT_Z_ROT = Math.PI/2;
class DNAViz {
    constructor() {
        let moleculeColours = [
            DNA_COLOURS.MOLECULE_A,
            DNA_COLOURS.MOLECULE_G,
            DNA_COLOURS.MOLECULE_T,
            DNA_COLOURS.MOLECULE_C,
            DNA_COLOURS.MOLECULE_U
        ];
        let moleculeHexColours = [
            DNA_HEX_COLOURS.MOLECULE_A,
            DNA_HEX_COLOURS.MOLECULE_G,
            DNA_HEX_COLOURS.MOLECULE_T,
            DNA_HEX_COLOURS.MOLECULE_C,
        ];
        this.basePairReps = basePairReps;
        this.basePairRepColours = [];
        for(let i=0, numPairs = this.basePairReps.length; i<numPairs; ++i) {
            this.basePairRepColours.push(moleculeHexColours.slice(0));
        }
        this.currentRep = 0;
        this.moleculeColours = moleculeColours;
        this.baseName = "DNAVizConfig";
        this.messageTimer = 3 * 1000;
    }

    init() {
        this.createColourScheme();
        //Load any preferences
        let prefs = localStorage.getItem(this.baseName + "Saved");
        if(prefs) {
            let value;
            for (let prop in appearanceConfig) {
                value = localStorage.getItem(this.baseName + prop);
                if (value) {
                    this.setGUI(prop, value);
                }
            }
        }
    }

    createColourScheme() {
        NDBColors = NGL.ColormakerRegistry.addSelectionScheme(
            [
                [this.moleculeColours[0], "DA or A"],
                [this.moleculeColours[3], "DG or G"],
                [this.moleculeColours[2], "DT"],
                [this.moleculeColours[1], "DC or C"],
                [this.moleculeColours[4], "U"],
                ["gray", "*"]
            ], "DNA_Protein");
    }

    getRepresentationColours(index) {
        return this.basePairRepColours[index];
    }

    changeColourScheme(molecule, colour) {
        this.moleculeColours[molecule] = colour;
        this.createColourScheme();
    }

    changeBasePairColour(molecule, colour) {
        let base = this.basePairRepColours[this.currentRep];
        base[molecule] = colour;
        //DEBUG
        console.log("Rep = ", this.currentRep);
        console.log("Colour = ", colour);
    }

    createScene(AXIS_PATH, BACKBONE_PATH, CRPATH, PROTEIN_PATH, PPATH, IPATH, SPATH) {
        this.stage = new NGL.Stage("viewport",
            {"cameraType": "perspective",
                "backgroundColor": appearanceConfig.Back});

        // Create RepresentationGroups for the input PDB
        let pdbRG = this.stage.loadFile(PROTEIN_PATH)
            .then(function(c) {
                let some = do_input(c);
                //DEBUG
                //$.extend(some, do_interactions(c, PPATH, IPATH, SPATH));//NEW
                return some;
            }, error);
        let axRG, bbRG, crRG;
        // Define dummy axis if we lack one
        if(AXIS_PATH != "") {
            // Create RepresentationGroups for the axis PDB
            axRG = this.stage.loadFile(AXIS_PATH)
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
        if(BACKBONE_PATH != "") {
            // Create RepresentationGroups for the backbone PDB
            bbRG = this.stage.loadFile(BACKBONE_PATH).then(do_bb, error);
        }

        // Wall: resolve all RepresentationGroups
        Promise.all([pdbRG, axRG, bbRG, crRG]).then( RG => {
            // Set initial orientation and zoom
            this.repData = {};
            reference_orientation_component.autoView();
            // Aggregate RepresentationGroups in repdata
            RG.forEach(rep => {
                $.extend(this.repData, rep);
            });
        }).then( () => {
            // Write GUI for RepresentationGroups
            // in specific containers, in a specific order.
            let RGdata = this.repData;
            if(RGdata["Nucleic Acid"])
                RGdata["Nucleic Acid"].GUI("nadisplay", true);
            if(RGdata["Axis"])
                RGdata["Axis"].GUI("axdisplay", true);
            if(RGdata["Backbone"])
                RGdata["Backbone"].GUI("bbdisplay", true);
            if(RGdata["MinorGroove"])
                RGdata["MinorGroove"].GUI("gr1display", false);
            if(RGdata["MajorGroove"])
                RGdata["MajorGroove"].GUI("gr2display", false);
            if(RGdata["Curvature"])
                RGdata["Curvature"].GUI("crdisplay", true);
            if(RGdata["Protein"])
                RGdata["Protein"].GUI("prodisplay", true);
            //Set initial orientation
            this.stage.setRotation(DEFAULT_X_ROT, DEFAULT_Y_ROT, DEFAULT_Z_ROT);
        });

        window.addEventListener(
            "resize", event => {
                this.stage.handleResize();
            }, false
        );
    }

    rotateModel(direction) {
        this.stage.rotateModel(direction);
    }

    createGUI() {
        //Create GUI - controlKit
        window.addEventListener('load', () => {

            let visibilityConfig = {
                NAcid: true,
                BBone: true,
                Axis: true,
                Protein: true
            };

            let _this = this;
            let controlKit = new ControlKit();

            controlKit.addPanel({width: 200})
                .addSubGroup({label: "Appearance", enable: false})
                    .addColor(appearanceConfig, "Back", {
                        colorMode: "hex", onChange: () => {
                            this.onBackgroundColourChanged(appearanceConfig.Back);
                        }
                    })
                    .addColor(appearanceConfig, "BBone", {
                        colorMode: "hex", onChange: () => {
                            this.onBackboneColourChanged(appearanceConfig.BBone);
                        }
                    })
                    .addColor(appearanceConfig, "A", {
                        colorMode: "hex", onChange: () => {
                            this.onMoleculeColourChanged(MOLECULES.A, appearanceConfig.A);
                        }
                    })
                    .addColor(appearanceConfig, "G", {
                        colorMode: "hex", onChange: () => {
                            this.onMoleculeColourChanged(MOLECULES.G, appearanceConfig.G);
                        }
                    })
                    .addColor(appearanceConfig, "T", {
                        colorMode: "hex", onChange: () => {
                            this.onMoleculeColourChanged(MOLECULES.T, appearanceConfig.T);
                        }
                    })
                    .addColor(appearanceConfig, "C", {
                        colorMode: "hex", onChange: () => {
                            this.onMoleculeColourChanged(MOLECULES.C, appearanceConfig.C);
                        }
                    })
                    .addSelect(appearanceConfig, "Pairs", {
                        selected: 0,
                        onChange: index => {
                            this.onChangeBasePairRepresentation(index);
                            //Update colour scheme
                            let colours = _this.getRepresentationColours(index);
                            appearanceConfig.A = colours[0];
                            appearanceConfig.G = colours[1];
                            appearanceConfig.T = colours[2];
                            appearanceConfig.C = colours[3];

                            //Fixes update bug in control kit
                            this.applyValue();

                            //DEBUG
                            //console.log("Rep = ", index);
                            //console.log("Colour = ", appearanceConfig.A);
                            //controlKit.update();
                        }
                    })
                    .addSelect(appearanceConfig, "Protein", {
                        selected: 0,
                        onChange: index => {
                            this.onChangeProteinRepresentation(index);
                        }
                    })
                .addSubGroup({label: "Visibility", enable: false})
                    .addCheckbox(visibilityConfig, "NAcid", {
                        onChange: () => {
                            this.toggleAcid();
                        }
                    })
                    .addCheckbox(visibilityConfig, "BBone", {
                        onChange: () => {
                            this.toggleBackbone();
                        }
                    })
                    .addCheckbox(visibilityConfig, "Axis", {
                        onChange: () => {
                            this.toggleAxis();
                        }
                    })
                    .addCheckbox(visibilityConfig, "Protein", {
                        onChange: () => {
                            this.toggleProtein();
                        }
                    })
                .addSubGroup( {label: "Preferences"} )
                    .addButton("Save", () => {
                        for(let prop in saveConfig) {
                            if(prop in appearanceConfig) {
                                saveConfig[prop] = appearanceConfig[prop];
                            }
                        }
                        this.savePreferences(saveConfig);
                    });
        });
    }

    onBackgroundColourChanged(colour) {
        this.stage.setParameters( {backgroundColor: colour} );
    }

    onBackboneColourChanged(colour) {
        this.repData["Backbone"].setParameters(
            {"colorScheme": "uniform",
            "colorValue":  colour,
            "radius":      0.3});
    }

    onMoleculeColourChanged(molecule, colour) {
        this.changeColourScheme(molecule, colour);
        this.repData["Nucleic Acid"].setComponentParameters(this.currentRep, {"colorScheme": NDBColors} );
        //Keep track of colours
        this.changeBasePairColour(molecule, colour);
    }

    onChangeBasePairRepresentation(representation) {
        this.repData["Nucleic Acid"].enable(representation);
        this.currentRep = representation;
    }

    onChangeProteinRepresentation(representation) {
        this.repData["Protein"].enable(representation);
    }

    toggleAcid() {
        this.repData["Nucleic Acid"].toggle();
    }

    toggleBackbone() {
        this.repData["Backbone"].toggle();
    }

    toggleAxis() {
        this.repData["Axis"].toggle();
    }

    toggleProtein() {
        this.repData["Protein"].toggle();
    }

    setGUI(prop, value) {
        let newValue = parseFloat(value);
        if(isNaN(newValue)) {
            appearanceConfig[prop] = value;
            return;
        }
        appearanceConfig[prop] = newValue;
    }

    savePreferences(config) {
        for(let prop in config) {
            localStorage.setItem(this.baseName + prop, config[prop]);
        }
        localStorage.setItem(this.baseName+"Saved", "Saved");
        this.displayMessage("Preferences saved");
    }

    displayMessage(msg) {
        $('#content').html(msg);
        $('#message').show();
        setTimeout( () => {
            $('#message').hide();
        }, this.messageTimer);
    }
}

$(document).ready(function(e){

    if(!Detector.webgl) {
        $("#notSupported").show();
        return;
    }

    $('#hideDetails').on("click", () => {
        $('#graphs').addClass("d-none");
        $('#showInfo').removeClass("d-none");
    });

    $('#showDetails').on("click", () => {
        $('#graphs').removeClass("d-none");
        $('#showInfo').addClass("d-none");
    });

    $('#hideSequence').on("click", () => {
        $('#sequenceInfo').addClass("d-none");
        $('#toggleSequenceInfo').removeClass("d-none");
    });

    $('#showSequence').on("click", () => {
        $('#sequenceInfo').removeClass("d-none");
        $('#toggleSequenceInfo').addClass("d-none");
    });


    let app = new DNAViz();
    app.init();
    app.createScene("data/output_X.pdb",
        "data/output_B.pdb",
        "data/output_R.pdb",
        "data/output.pdb",
        "data/pairings.dat",
        "data/interactions.dat",
        "data/sequence.dat");
    app.createGUI();

    $('#rotateY').on("click", () => {
        app.rotateModel(1);
    });
});

function safariw(data, target) {
    var url = URL.createObjectURL( data );
    target.location.href = url;
}

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
                    comp.addRepresentation( "licorice",   {"colorScheme": NDBColors}))
                .addRepresentation( "Element",
                    comp.addRepresentation( "ball+stick", {"colorScheme": "element"}))
                .addRepresentation( "Surface",
                    comp.addRepresentation( "surface",    {"opacity": Nso,
                        "colorScheme": "uniform",
                        "colorValue":  Ncs}))
                .addRepresentation( "Cylinder",
                    comp.addRepresentation( "base",   {"colorScheme": NDBColors}))
                .addRepresentation( "Smooth",
                    comp.addRepresentation( "hyperball",   {"colorScheme": NDBColors}))
                .addRepresentation( "Spacefill",
                    comp.addRepresentation( "spacefill",   {"colorScheme": NDBColors}))
                .addRepresentation( "Slab",
                    comp.addRepresentation( "slab",   {"colorScheme": NDBColors})),
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
                .addRepresentation( "Ribbon",
                    comp.addRepresentation( "ribbon", {"colorScheme": "uniform",
                        "colorValue": Pcc}))
                .addRepresentation( "Rope",
                    comp.addRepresentation( "rope", {"colorScheme": "uniform",
                        "colorValue": Pcc}))
                .addRepresentation( "Tube",
                    comp.addRepresentation( "tube", {"colorScheme": "uniform",
                        "colorValue": Pcc}))
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

