"use strict"
var renderer, stage, zoom, world, carBody, materials = {};

var offsetX = 0;
var offsetY = 0;
const GROUND = 1<<0;
const CAR = 1<<1;

var heightMap = generateHeightMap(123, 250);
init();
animate();

function generateHeightMap(seed, size) {
	var r = new Random(seed);
	const smooth = 20;
	var arr = Array(size*smooth);
	var hardiness;
	//(r.next() % 100) * 0.01
	for(var i=0;i<size;i++) {
		var from = i > 0 ? arr[i*smooth - 1] : 0;
		if(i < 10) {
			hardiness = 0;
		} else if(i<size*0.25) {
			hardiness = 0.01;
		} else if(i<size*0.5) {
			hardiness = 0.02;
		} else if(i<size*0.75) {
			hardiness = 0.03;
		} else {
			hardiness = 0.04;
		}
		var to = (r.next() % 100) * hardiness;
		var step = (to-from)/smooth;
		for(var n=0;n<=smooth;n++) {
			arr[i*smooth+n] = from+step*n;
		}
	}
	return arr;
}

function init(){
	// Init p2.js
	
	world = new p2.World();
	// Add a box
	var boxShape = new p2.Box({ width: 2, height: 1 });
	boxShape.collisionGroup = CAR;
	boxShape.collisionMask = GROUND;
	var boxBody = new p2.Body({
		mass:1,
		position:[0,5],
		angularVelocity:1
	});
	boxBody.addShape(boxShape);
	world.addBody(boxBody);
	zoom = 25;
	// Initialize the stage
	renderer =	PIXI.autoDetectRenderer(600, 400);
	stage = new PIXI.Container();
	document.body.appendChild(renderer.view);
	renderer.backgroundColor = 0xffffff;
	// Add transform to the stage
	stage.position.x =	renderer.width/2 + offsetX; // center at origin
	stage.position.y =	renderer.height/2 + offsetY;
	stage.scale.x =	 zoom;	// zoom in
	stage.scale.y = -zoom; // Note: we flip the y axis to make "up" the physics "up"
	
	//materials
	var wheelMaterial = new p2.Material();
	var steelMaterial = new p2.Material();
	var groundMaterial = new p2.Material();
	
	materials.wheel = wheelMaterial;
	materials.steel = steelMaterial;
	materials.ground = groundMaterial;
	
	world.addContactMaterial(new p2.ContactMaterial(wheelMaterial, groundMaterial, {
	    friction : 0.4
	}));
	
	world.addContactMaterial(new p2.ContactMaterial(steelMaterial, groundMaterial, {
	    friction : 0.2
	}));
	
	//add height map
	const step = 0.1;
	var heightfieldShape = new p2.Heightfield({
		heights: heightMap,
		elementWidth: step, // Distance between the data points in X direction
		angle: Math.PI / 2
	});
	heightfieldShape.collisionGroup = GROUND;
	heightfieldShape.collisionMask = CAR;
	heightfieldShape.material = materials.ground;
	
	var heightfieldBody = new p2.Body({position:[-step*2,0], mass: 0});
	heightfieldBody.addShape(heightfieldShape);
	world.addBody(heightfieldBody);
	
	carBody = createCar();
	
	createPixiFromP2();
}

function createCar() {
	var chase = [
		0.5,
		0.5,
		2,
		2,
	]
	
	const VERTINDEX = 3;

	function chaseToPolygon(chase) {
		var polygon = [];
		var stepAngle = Math.PI*2/chase.length;
		var angle;
		for(var i=0;i<chase.length;i++) {
			angle = i*stepAngle;
			polygon.push([
				Math.cos(angle) * chase[i],
				Math.sin(angle) * chase[i]
			])
		}
		return polygon;
	}
	var polygon = chaseToPolygon(chase);
	console.log('polygon', polygon)
	
	var carBody = new p2.Body({position: [5, 5], mass: 5});
	carBody.fromPolygon(polygon);
	
	carBody.shapes[0].collisionGroup = CAR;
	carBody.shapes[0].collisionMask = GROUND;
	carBody.material = materials.steel;
	
	world.addBody(carBody);
	
	var w1Shape = new p2.Circle({radius: 0.5});
	var w1 = new p2.Body({position: [
		carBody.shapes[0].vertices[VERTINDEX][0] + carBody.position[0],
		carBody.shapes[0].vertices[VERTINDEX][1] + carBody.position[1]
	], mass: 10});
	w1.addShape(w1Shape);
	w1Shape.collisionGroup = CAR;
	w1Shape.collisionMask = GROUND;
	w1Shape.material = materials.wheel;
	
	world.addBody(w1);
	var revolute = new p2.RevoluteConstraint(carBody, w1, {
		localPivotA: [
			carBody.shapes[0].vertices[VERTINDEX][0],
			carBody.shapes[0].vertices[VERTINDEX][1]
		],
		localPivotB: [0, 0],
		collideConnected: false
	});
	
	revolute.enableMotor();
	revolute.setMotorSpeed(5)
	
	world.addConstraint(revolute);
	
	return carBody;
}

function createPixiFromP2() {
	stage.position.x =	renderer.width/2; // center at origin
	stage.position.y =	renderer.height/2;
	
	stage.removeChildren();
	
	world.bodies.forEach(body=>{
		body.shapes.forEach(shape=>{
			if(shape instanceof p2.Box) {
				box(body, shape);
			} else if(shape instanceof p2.Circle) {
				circle(body, shape);
			} else if(shape instanceof p2.Convex) {
				convex(body, shape);
			} else if(shape instanceof p2.Heightfield) {
				heightfield(body, shape);
			} else {
				//unknown shape
				console.log('unknown shape', shape);
			}
		})
	})
	
	function box(p2body, p2shape) {
		var graphics = new PIXI.Graphics();
		graphics.p2body = p2body;
		graphics.p2shape = p2shape;
		graphics.beginFill(0xff0000, 0.5);
		graphics.drawRect(-p2shape.width/2, -p2shape.height/2, p2shape.width, p2shape.height);
		graphics.endFill();
		stage.addChild(graphics)
	}
	
	function circle(p2body, p2shape) {
		var graphics = new PIXI.Graphics();
		graphics.p2body = p2body;
		graphics.p2shape = p2shape;
		graphics.beginFill(0x00ff00, 0.5);
		graphics.drawCircle(0, 0, p2shape.radius);
		graphics.endFill();
		graphics.moveTo(0, 0);
		graphics.lineStyle(0.1, 0x000000, 1);
		graphics.lineTo(p2shape.radius, 0);
		stage.addChild(graphics)
	}
	
	function convex(p2body, p2shape) {
		var graphics = new PIXI.Graphics();
		graphics.p2body = p2body;
		graphics.p2shape = p2shape;
		const lineWidth = 0.1;
		const lineColor = 0x0000ff;
		const pointColor = 0x00ffff;
		var verts = p2shape.vertices;
		for(var i=0;i<verts.length;i++) {
			var v0 = verts[i%verts.length],
				v1 = verts[(i+1)%verts.length],
				x0 = v0[0],
				y0 = v0[1],
				x1 = v1[0],
				y1 = v1[1];
				graphics.lineStyle(lineWidth, lineColor, 1);
				graphics.moveTo(x0,y0);
				graphics.lineTo(x1,y1);
				graphics.lineStyle(lineWidth, pointColor, 1);
				graphics.drawCircle(x0,y0,lineWidth/2);
		}
		stage.addChild(graphics)
	}
	
	function heightfield(p2body, p2shape) {
		var graphics = new PIXI.Graphics();
		graphics.p2body = p2body;
		graphics.p2shape = p2shape;
		const lineWidth = 0.1;
		graphics.lineStyle(lineWidth, 0x000000, 1);
		var x = 0;
		graphics.moveTo(x, p2shape.heights[0] - lineWidth/2);
		x+=p2shape.elementWidth
		for(var i=1;i<p2shape.heights.length;i++) {
			graphics.lineTo(x, p2shape.heights[i] - lineWidth/2);
			x+=p2shape.elementWidth
		}
		stage.addChild(graphics)
	}
}

function updatePixiItemsFromP2World() {
	stage.children.forEach(child=>{
		if(!child.p2body) return;
		child.position.x = child.p2body.position[0];
		child.position.y = child.p2body.position[1];
		child.rotation = child.p2body.angle;
	});
}
// Animation loop
function animate(t){
	t = t || 0;
	requestAnimationFrame(animate);
	// Move physics bodies forward in time
	world.step(1/60);
	
	stage.position.x =	renderer.width/2 - carBody.position[0]*zoom + offsetX*zoom; // center at origin
	stage.position.y =	renderer.height/2 + carBody.position[1]*zoom + offsetY*zoom;
	stage.scale.x =	 zoom;	// zoom in
	stage.scale.y = -zoom; // Note: we flip the y axis to make "up" the physics "up"
	
	updatePixiItemsFromP2World();
	
	renderer.render(stage);
}