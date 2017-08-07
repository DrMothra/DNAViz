// XXX hacky way to control DNA coloring
var bColor = false;

function augment(Super,New) {
    var ret = Object.create(Super.prototype);
    for(var v in New)
	ret[v] = New[v];
    return ret;
}

var DNA = DNA || {};            // Package DNA
/* ------------------------------------------------------------------------
 * The main nucleic acid molecule objects are:
 * 
 * Object3D -> na -> dna
 *                -> rbpdna
 *
 * DNA.dna and DNA.rbpdna are lists of levels:
 *
 * Object3D -> level -> rigidbasepair
 *                   -> basepair
 *
 * DNA.basepair contains 2 bases:
 *
 * Object3D -> base
 *
 * DNA.player controls action.
 * ------------------------------------------------------------------------
 */

// ------------------------------------------------------------------------
// Object3D -> na -> dna
//                -> rbpdna
// Generic DNA with interpolated backbone
DNA.na = function(sequence, nstrand, nbp, frames) {
    THREE.Object3D.call(this);
    this.matrixAutoUpdate = false;
    this.rotationAutoUpdate = false;

    //XXX centralise settings
    this.backboneRadius = 0.5;
    
    this.radius =	10;	       // X 10 Ang
    this.bpside=	8.9443;	       // Y 8.9443 Ang
    //-- phosphate position
    this.dtheta= 	0.705*Math.PI;	     // Y rad
    this.rot0 =	0.5*(Math.PI - this.dtheta); // Y rad
    
    if(!sequence || sequence==null)
	sequence = "";
    if(sequence.length != nbp) {
	console.warn("DNA: Wrong sequence <"+sequence+"> for "+nbp+" levels");
	for(var i=sequence.length;i<nbp;i++)
	    sequence += " ";
	sequence = sequence.slice(0, nbp);
    }
    this.sequence = sequence;

    this.nbp = 	nbp;
    this.numStrands = nstrand;
    this.frame = frames;

    this.level = [];		// array of levels
    this.backbone = [];		// array of THREE.Line
    
    this.backbone_smooth = 5;

    // ABSTRACT
};
// ----------------------------------------------
DNA.na.prototype = augment(THREE.Object3D, {
    //updateMatrix: function() {console.log("up!");},
    //updateMatrixWorld: function() {console.log("up!");},
    // ----------
    createMaterials: function() {
	this.PhosphateMaterial = this.createPhosphateMaterial(0xFFFF33);
	this.BaseMaterial = this.createBaseMaterial(0xFF0000);
	this.BackboneMaterial = [
	    this.createBackboneMaterial(0xDD5500),
	    this.createBackboneMaterial(0x0055DD)];
    },
    // ----------
    createPhosphateMaterial : function(color) {
	return new THREE.MeshPhongMaterial( {
	    color: color,
	    ambient: _cdim(color, 0x555533),
	    specular: _cbst(color, 0x555533),
	    opacity: 1,
	    shininess: 1,
	    reflectivity: 1.0
	});
    },
    // ----------
    createBaseMaterial : function(color) {
	return new THREE.MeshPhongMaterial({
	    color: color,
	    opacity: 1,
	    shininess: 1,
	    reflectivity: 1.0
	});
    },
    // ----------
    createBackboneMaterial: function(color) {
	return new THREE.MeshPhongMaterial({
	    color: color,
	    opacity: 0.8,
	    transparent: true,
	    shininess: 1,
	    reflectivity: 1.0,
	    ambient: 0x555533
	});
    },
    // setPhosphateMaterial : function(mat) {}
    // setBaseMaterial : function(mat) {}
    // setBackboneMaterial : function(mat) {}
    // ----------
    setFrame: function(frames) {
	this.frame = frames;
	// set frame to children
	// this.setDirty();
    },
    // ----------
    // setDirty: function() {
    // 	this.dirty = true;
    //        // set to children
    // 	var _len=this.nbp;
    // 	for(var _p = 0; _p < _len; _p++) {
    // 	    this.level[_p].setDirty();
    // 	}
    // },
    // ----------
    createObjects: function() {},
    // ----------
    getPhosphatePositions: function(strand_index) {},
    // ----------
    center: function() {
	var cen = _v(0,0,0);
	var _len=this.nbp;
	for(var _p = 0; _p < _len; _p++) {
	    cen.addSelf(this.level[_p].center());
	}
	return cen.divideScalar(_len);
    },
    // ----------
    createBackbone: function(real) {
	for(var _s=0, _len=this.numStrands; _s<_len; _s++) {
	    var v = [new THREE.Vector3(0,0,0), new THREE.Vector3(10,10,10)];
	    if(real)
		v = this.getPhosphatePositions(_s);
	    var line = new THREE.SplineCurve3(v);
	    var geo = new THREE.TubeGeometry(line, 100, this.backboneRadius, 10, false);
	    var bb = new THREE.Mesh(geo, this.BackboneMaterial[_s]);
	    this.add(bb);
	    this.backbone.push(bb);
	}
    },
    // ----------
    updateBackbone: function() {
	for(var _s=0, _len=this.numStrands; _s<_len; _s++) {
	    this.remove(this.backbone[_s]);
	    // var poss=this.getPhosphatePositions(_s);
	    // for(var i=0; i<poss.length; i++) {
	    // 	var p = this.level[0].base[0].createSphere(4,2,this.PhosphateMaterial);
	    // 	console.log(poss[i]);
	    // 	p.matrix.setPosition(poss[i]);
	    // 	this.add(p);
	    // }
	}
	this.backbone=[];
	this.createBackbone(true);
    },
    // ----------
    neighbour: function(bpi, delta) {
	bpi = Math.max(Math.min(bpi.index+delta, this.nbp-1), 0);
	return this.level[bpi];
    },
    // ----------
    update : function(dt) {
	return;
	//this.matrix.setPosition(this.matrix.getPosition().addSelf(_v(dt,0,0)));
	//-- Update levels
	for(var _p = 0, _len=this.nbp; _p < _len; _p++) {
	    this.level[_p].update(dt);
	}
	this.updateBackbone();
    },
    // ----------
    destroy : function() {
	for(var _p = 0, _len=this.nbp; _p < _len; _p++)
	    this.level[_p].destroy();
    }
});

// ------------------------------------------------------------------------
// 2-strand B-dna rigid-base model
DNA.dna = function(sequence, nstrand, nbp, frames) {
    DNA.na.call(this, sequence, 2, nbp);
    this.levelClass = DNA.basepair;
    this.createMaterials();
    this.createObjects();
    if(frames)
	this.setFrame(frames);
};
DNA.dna.prototype = augment(DNA.na, {
    // ----------
    createObjects: function() {
	//-- create bps
	for(var i=0; i<this.nbp; i++) {
	    var bp = new this.levelClass(i, this.sequence[i], this); //XXX remove i, parent
	    this.level.push(bp);
	    this.add(bp);
	}
	//-- create bb
	this.createBackbone();
    },
    // ----------
    setFrame: function(frames) {
	if(frames.length != this.nbp) {
	    console.warn("DNA: Wrong number of frames ("+frames.length+") for "+this.nbp+" levels");
	    return false;
	}
	this.frame = frames;
	// set frame to children
	for(var _p = 0, _len=this.nbp; _p < _len; _p++) {
	    this.level[_p].setFrame(this.frame[_p]);
	}
	this.updateMatrixWorld(true); // force update
	this.updateBackbone();
    },
    // ----------
    getPhosphatePositions: function(strand_index) {
	var ret = [];
	for(var _p = 0, _len=this.nbp; _p < _len; _p++) {
	    ret.push(
		vp(this.worldToLocal(
		    this.level[_p].getPhosphate(strand_index).matrixWorld.getPosition())));
	}
	return ret;
    },
});

// ------------------------------------------------------------------------
// 2-strand B-dna rigid-base-pair model
DNA.rbpdna = function(sequence, nstrand, nbp, frames) {
    DNA.na.call(this, sequence, nstrand, nbp, frames);
    this.numStrands = 2;
    this.levelClass = DNA.rigidbasepair;
    this.createMaterials();
    this.createObjects();
    this.setFrame(frames);
};
DNA.rbpdna.prototype = augment(DNA.dna, {}); // XXX hacky



// ------------------------------------------------------------------------
// ------------------------------------------------------------------------
// Object3D -> level -> rigidbasepair
//                   -> basepair
DNA.level = function(index, type, parent, frame) {
    THREE.Object3D.call(this);
    this.matrixAutoUpdate = false;
    this.rotationAutoUpdate = false;
    //XXX centralise settings
    this.phosphateRadius = 1;	// Y 1 Ang
    this.slab_thickness = 1;	// Y 1 Ang

    this.type = type;
    this.dna = parent;
    this.index = index;		// remove
    this.frame = frame;		// remove

    // ABSTRACT
};
DNA.level.prototype = augment(THREE.Object3D, {
    // ----------
    setFrame: function(frame) {
	this.frame = frame;
	// set to children
	// set dirty?
    },
    // ----------
    update: function(dt) {},
    // ----------
    center: function() {},
    // ----------
    destroy: function() {}
});

// ----------------------------------------------
DNA.rigidbasepair = function(index, type, parent, frame) {
    DNA.level.call(this, index, type, parent);
    this.slab = null;
    this.p = [];

    this.createObjects();
    if(frame)
	this.setFrame(frame);
};
DNA.rigidbasepair.prototype = augment(DNA.level, {
    // ----------
    setFrame: function(frames) {
	this.frame = frames[0];
	this.matrix = this.frame;
	this.matrixWorldNeedsUpdate = true;
    },
    // ----------
    createObjects: function() {
	// -- base pair slab
	var l = this.dna.bpside;
	this.slab = this.createSlab(l);
	for(var _s=0; _s<this.dna.numStrands; _s++)
	    this.p.push(this.createSphere()); // position
	this.add(this.slab);
	for(var _s=0; _s<this.dna.numStrands; _s++)
	    this.add(this.p[_s]);
    },
    // ----------
    createSphere: function() {
	// -- phosphate
	var sphere = new THREE.Mesh(
	    new THREE.SphereGeometry( this.phosphateRadius ),
	    this.dna.PhosphateMaterial );
	sphere.matrixAutoUpdate = false;
	return sphere;
    },
    // ----------
    createSlab: function(l) {
	var slab = new THREE.Mesh(
	    new THREE.CubeGeometry( 2*l, l, this.slab_thickness),
	    this.dna.createBaseMaterial(0xFF0000) );
	slab.matrixAutoUpdate = false;
	// nice basepair
	// XXX move color to remove index
	// slab.material.color.b = this.index/this.dna.nbp; // XXX different colors for strands?
	// slab.material.color.r = 1-this.index/this.dna.nbp;
	slab.material.color = _rainbow(this.index, this.dna.nbp);
	slab.material.ambient = _cdim(slab.material.color, 0x222222);
	slab.material.specular = _cbst(slab.material.color, 0x222222);
	slab.castShadow = true;
	slab.receiveShadow = true;
	return slab;
    },
    // ----------
    update: function(dt) {
	return;
    },
    // ----------
    getPhosphate: function(strand_index) {
	return this.p[strand_index];
    },
    // ----------
    // constrainPhosphates: function(construction) {
    // 	// constrain phosphates
    // 	// XXX 2-strands!
    // 	this.p[0].matrix.setPosition(this.slab.matrix.multiplyVector3(_v(this.dna.radius*Math.cos(this.dna.rot0),
    // 									 this.dna.radius*Math.sin(this.dna.rot0),0)));
    // 	this.p[1].matrix.setPosition(this.slab.matrix.multiplyVector3(_v(this.dna.radius*Math.cos(Math.PI-this.dna.rot0),
    // 									 this.dna.radius*Math.sin(Math.PI-this.dna.rot0),0)));
    // },
    // ----------
    center: function() {
	return this.slab.matrix.getPosition(); //XXX circa
    },
    // ----------
    destroy: function() {
	for(var _s=0; _s<this.dna.numStrands; _s++) {}
    },
});


// ----------------------------------------------
DNA.basepair = function(index, type, parent, frame) {
    DNA.level.call(this, index, type, parent);
    // this.frame = [Matrix4, Matrix4]
    this.base = [];

    this.side = this.dna.bpside; // remove
    this.translation = _v(0,this.side/2,0);

    this.createObjects();
    if(frame)
	this.setFrame(frame);
};
DNA.basepair.prototype = augment(DNA.level, {
    // ----------
    setFrame: function(frame) {
	this.frame = frame;
	if(this.frame.length && this.frame.length != this.dna.numStrands) {
	    console.log("basepair: Wrong number of frames!");
	    return null;
	}
	// set to children (Translate)
	for(var _s=0; _s<this.dna.numStrands; _s++) {
	    var R = this.frame[_s].clone();
	    R.translate(this.translation); // move out
	    this.base[_s].setFrame(R);
	}
    },
    // ----------
    baseType: function(strand_index) {
	if(strand_index == 0)
	    return this.type;
	else
	    return wcc(this.type);
    },
    // ----------
    createObjects: function() {
	// -- base pair slab
	for(var _s=0; _s<this.dna.numStrands; _s++) {
	    var base = new DNA.base(this.side, this.baseType(_s), this);
	    this.base.push(base);
	    this.add(base);
	}
    },
    // ----------
    update: function(dt) {
	for(var _s=0; _s<this.dna.numStrands; _s++) {
	    this.base[_s].update(dt);
	}
    },
    // ----------
    getPhosphate: function(strand_index) {
	return this.base[strand_index].phosphate;
    },
    // ----------
    center: function() {
	var cen = 0.0;
	var _len = this.dna.numStrands;
	for(var _k=0; _k<_len; _k++) {
	    return this.base[_k].center();
	}
	return cen/_len;
    },
    // ----------
    destroy: function() {
	for(var _s=0; _s<this.dna.numStrands; _s++)
	    this.base[_s].destroy();
    },
});


// ----------------------------------------------
// ----------------------------------------------
DNA.base = function(side, type, parent, frame) {
    THREE.Object3D.call(this);
    this.matrixAutoUpdate = false;
    this.rotationAutoUpdate = false;
    //XXX centralise settings
    this.phosphateRadius = 1;	// Y 1 Ang
    this.slab_thickness = 1;	// Y 1 Ang

    this.type = type;
    this.level = parent;	   // remove
    this.index = this.level.index; // remove
    this.dna = this.level.dna;	   // remove

    //createObjects() {
    this.slab  = this.createSlab(side);
    this.phosphate = this.createSphere(this.phosphateRadius, this.dna.PhosphateMaterial);
    this.phosphate.matrix.setPosition(_v(side/2,side/2,0));

    this.add(this.slab);
    this.add(this.phosphate);
    //}
    if(frame)
	this.setFrame(frame);
};
DNA.base.prototype = augment(THREE.Object3D, {
    // ----------
    setFrame: function(frame) {
	this.frame = frame;
	this.matrix = this.frame;
    },
    // ----------
    createSphere: function(radius, material) {
	// -- phosphate
	var sphere = new THREE.Mesh(
	    new THREE.SphereGeometry( radius ), material );
	sphere.matrixAutoUpdate = false;
	return sphere;
    },
    // ----------
    createSlab: function(l) {
	var slab = new THREE.Mesh(
	    new THREE.CubeGeometry( l, l, this.slab_thickness),
	    this.dna.createBaseMaterial(0xFF0000) );
	slab.matrixAutoUpdate = false;
	// nice basepair
	// XXX move color
	if(this.type == "" || !bColor) {
	    // slab.material.color.b = this.index/this.dna.nbp; // XXX different colors for strands?
	    // slab.material.color.r = 1-this.index/this.dna.nbp;
	    slab.material.color = _rainbow(this.index, this.dna.nbp);
	}else{
	    slab.material.color.b = 0;
	    slab.material.color.r = 0;
	    if(this.type[0]=='A')
		//slab.material.color.b = .6;
		slab.material.color = _c(0xDD5500)
	    else if(this.type[0]=='T') {
		// slab.material.color.r = .6;
		// slab.material.color.g = .6;
		slab.material.color = _c(0x0055DD)
	    } else if(this.type[0]=='G')
		// slab.material.color.r = .6;
		slab.material.color = _c(0xBB0033)
	    else if(this.type[0]=='C') {
		// slab.material.color.b = .6;
		// slab.material.color.g = .6;
		slab.material.color = _c(0x00BB33)
	    }
	}
	// slab.material.color.b *= this.index/this.dna.nbp;
	// slab.material.color.r *= 1-this.index/this.dna.nbp;
	slab.material.ambient = _cdim(slab.material.color, 0x222222);
	slab.material.specular = _cbst(slab.material.color, 0x222222);
	slab.castShadow = true;
	slab.receiveShadow = true;
	return slab;
    },
    // ----------
    center: function() {
	return this.matrix.getPosition(); //XXX circa
    },
    // ----------
    destroy: function() {},
    // ----------
    update: function(dt) {
	return;
	// check dirty
	// this.funMove(dt);  //debug
	this.slab.matrix = this.frame;
	this.phosphate.matrix.setPosition(this.slab.matrix.clone().translate(_v(delta,delta,0)).getPosition());
    },
    // ----------
    funMove: function(dt) {
	dt = dt*10;
	var old = this.slab.matrix.getPosition();
	this.slab.matrix.setPosition(old.addSelf(_v(dt,0,0)));
	old = this.phosphate.matrix.getPosition();
	this.phosphate.matrix.setPosition(old.addSelf(_v(dt,0,0)));
	this.slab.matrixWorldNeedsUpdate = true;
	this.phosphate.matrixWorldNeedsUpdate = true;
    }
});


// ----------------------------------------------
DNA.player = function(thedna, steps, element) {

    var _this = this;
    
    this.dna = thedna;
    this.steps = steps;

    this.logger = element;
    this.logger.bind('mousedown', function(e) {_this.toggle()});

    this.framerate = 10;		// fps
    this.playing = false;

    this._cumtime = 0.0;
    this._curstep = 0;

    this.play = function() {
	if(this.playing) return true;
	this.playing = true;
    };
    
    this.pause = function() {
	if(!this.playing) return true;
	this.playing = false;
    };
    
    this.toggle = function() {
	this.playing = !this.playing;
    };
    
    this.update = function(dt) {
	if(!this.playing) return;
	this._cumtime += dt;
	if(this._cumtime > 1.0/this.framerate) {
	    this._cumtime = 0.0;
	    this.scan(1);
	}
    };
    
    this.setStep = function(step) {
	//console.log('Player: set step ' + step);
	this.log("step "+(step+1)+"/"+this.steps.length);
	this.dna.setFrame(this.steps[step]);
    };

    this.scan = function(delta) {
	this._curstep += delta;
	if(this._curstep >= this.steps.length) // XXX loop mode
	    this._curstep -= this.steps.length;
	if(this._curstep < 0) // XXX loop mode
	    this._curstep += this.steps.length;
	this.setStep(this._curstep);
    }
	
    this.log = function(msg) {
	element.html(msg);
    };
    
    function keydown(event) {
	window.removeEventListener( 'keydown', keydown );
	if(event.keyCode == 80 || event.keyCode == 32 || event.keyCode == 35) {
	    _this.toggle();
	}else if(event.keyCode == 37) {
	    _this.pause();
	    _this.scan(-1);
	}else if(event.keyCode == 39) {
	    _this.pause();
	    _this.scan(1);
	}else{
	    //console.log(event.keyCode);
	}
    };
    
    function keyup(event) {
	window.addEventListener( 'keydown', keydown, false );
    };
    
    window.addEventListener( 'keyup', keyup, false );
    keyup();
    this.setStep(this._curstep);

};
