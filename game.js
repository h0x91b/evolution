"use strict"
var renderer, stage, zoom, world, cameraBody, car, materials = {}, generation;

var offsetX = 0;
var offsetY = 0;
var timeMultiplier = 3;
const GROUND = 1<<0;
const CAR = 1<<1;

var heightMap = generateHeightMap(123, 250);
setTimeout(function(){
	init();
	requestAnimationFrame(animate);
}, 0);

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
		friction : 2,
		restitution: 0.3
	}));
	
	world.addContactMaterial(new p2.ContactMaterial(steelMaterial, groundMaterial, {
		friction : 0.05,
		stiffness: 5000000,
		restitution: 0.1
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
		
	beginGame();
}

function Car() {
	this.chassisMass = 0;
	this.score = 0;
	this.chassis = [];
	this.wheels = [];
	this.bodies = [];
	this.constraints = [];
}

Car.prototype.clone = function clone() {
	var car = new Car;
	car.chassisMass = this.chassisMass;
	car.chassis = this.chassis.slice(0);
	car.wheels = this.wheels.map(w=>{
		return JSON.parse(JSON.stringify(w));
	});
	return car;
}

//static method
Car.prototype.randomCar = function randomCar() {
	var i;
	var car = new Car;
	var edges = Math.floor(Math.random()*7) + 5;
	var chassisMass = 0;
	for(i=0;i<edges;i++) {
		let length = Math.random()*3;
		chassisMass += length;
		car.chassis.push(length);
	}
	var avg = chassisMass / edges;
	chassisMass = avg * 125; //max 1500 kg
	car.chassisMass = chassisMass;
	// 50% - 1
	// 10% - 2
	// 5% - 3
	// 1% - 4
	var wheels = 0;
	var rnd = Math.random()*100;
	if(rnd > 99) {
		wheels = 4;
	} else if(rnd > 94) {
		wheels = 3;
	} else if(rnd > 89) {
		wheels = 2;
	} else if(rnd > 50) {
		wheels = 1;
	}
	for(i=0;i<wheels;i++) {
		let ptIndex = Math.floor(Math.random() * 100) % edges;
		let radius = Math.random()*1.0 + 0.15;
		let motorSpeed = Math.random()*10 + 1;
		if(Math.random() < 0.5)
			motorSpeed *= -1;
		let mass = radius * radius * Math.PI * 14; //max 100kg
		car.wheels.push({
			ptIndex: ptIndex,
			radius: radius,
			motorSpeed: motorSpeed,
			mass: mass
		});
	}
	return car;
}

Car.prototype.mutate = function mutate() {
	this.chassis = this.chassis.map(l=>{
		if(Math.random() < 0.5)
			return l + (Math.random() * 0.05)*l;
		else
			return l - (Math.random() * 0.05)*l;
	});
	if(Math.random() < 0.05 && this.chassis.length < 12) {
		this.chassis.push(Math.random()*3);
	}
	if(Math.random() < 0.05 && this.chassis.length > 5) {
		this.chassis.shift();
	}
	this.wheels = this.wheels.map(w=>{
		//fix ptIndex if edge was removed
		w.ptIndex = w.ptIndex % this.chassis.length;
		if(Math.random() < 0.05) {
			w.ptIndex = Math.floor(Math.random() * 100) % this.chassis.length;
		}
		if(Math.random() < 0.5)
			w.radius = w.radius + (Math.random() * 0.05)*w.radius;
		else
			w.radius = w.radius - (Math.random() * 0.05)*w.radius;
		w.mass = w.radius * w.radius * Math.PI * 14; //max 100kg
		if(Math.random() < 0.5)
			w.motorSpeed = w.motorSpeed + (Math.random() * 0.05)*w.motorSpeed;
		else
			w.motorSpeed = w.motorSpeed - (Math.random() * 0.05)*w.motorSpeed;
		return w;
	});
	if(Math.random() < 0.15 && this.wheels.length < 4) {
		let ptIndex = Math.floor(Math.random() * 100) % this.chassis.length;
		let radius = Math.random()*1.0 + 0.15;
		let motorSpeed = Math.random()*10 + 1;
		if(Math.random() < 0.5)
			motorSpeed *= -1;
		let mass = radius * radius * Math.PI * 14; //max 100kg
		this.wheels.push({
			ptIndex: ptIndex,
			radius: radius,
			motorSpeed: motorSpeed,
			mass: mass
		});
	}
	if(Math.random() < 0.05) {
		this.wheels.shift();
	}
};

Car.prototype.removeFromP2 = function removeFromP2() {
	this.constraints.forEach(world.removeConstraint.bind(world));
	this.bodies.forEach(world.removeBody.bind(world));
	this.constraints = [];
	this.bodies = [];
	createPixiFromP2();
}

Car.prototype.toP2 = function toP2() {
	var self = this;
	
	var carBody = new p2.Body({position: [10, 5], mass: this.chassisMass});
	var polygon = chaseToPolygon(this.chassis);
	decomp.makeCCW(polygon);
	var convexPolygons = decomp.decomp(polygon);
	convexPolygons.forEach(c=>{
		var convex = new p2.Convex({vertices: c});
		convex.collisionGroup = CAR;
		convex.collisionMask = GROUND;
		carBody.addShape(convex);
	});
	
	carBody.material = materials.steel;
	world.addBody(carBody);
	this.bodies.push(carBody);
	cameraBody = carBody;
	
	this.wheels.forEach(w=>{
		var shape = new p2.Circle({radius: w.radius});
		shape.collisionGroup = CAR;
		shape.collisionMask = GROUND;
		shape.material = materials.wheel;
		var polygon = chaseToPolygon(self.chassis);
		var x = polygon[w.ptIndex][0] + carBody.position[0];
		var y = polygon[w.ptIndex][1] + carBody.position[1];
		var body = new p2.Body({
			position: [x,y],
			mass: w.mass
		});
		body.addShape(shape);
		
		var revolute = new p2.RevoluteConstraint(carBody, body, {
			localPivotA: [
				polygon[w.ptIndex][0],
				polygon[w.ptIndex][1]
			],
			localPivotB: [0, 0],
			collideConnected: false
		});
	
		revolute.enableMotor();
		revolute.setMotorSpeed(w.motorSpeed);
		world.addConstraint(revolute)
		this.constraints.push(revolute);
		
		world.addBody(body);
		this.bodies.push(body);
	})
	
	createPixiFromP2();
	
	function chaseToPolygon(chase) {
		var polygon = [];
		var stepAngle = Math.PI*2/self.chassis.length;
		var angle;
		for(var i=0;i<self.chassis.length;i++) {
			angle = i*stepAngle;
			polygon.push([
				Math.cos(angle) * self.chassis[i],
				Math.sin(angle) * self.chassis[i]
			]);
		}
		return polygon;
	}
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

function Generation() {
	const CARS = 10;
	this.generation = 0;
	this.cars = [];
	for(var i=0;i<CARS;i++) {
		this.cars.push(Car.prototype.randomCar());
	}
}

Generation.prototype.newGeneration = function beginRound() {
	this.generation++;
	this.cars.sort((a, b)=>{
		return b.score - a.score;
	});
	console.log('best score from previous generation is', this.cars[0].score)
	if(this.generation > 1) {
		let cars = this.cars;
		this.cars = [
			cars[0].clone(),
			cars[0].clone(),
			cars[0].clone(),
			cars[0].clone(),
			cars[0].clone(),
			cars[1].clone(),
			cars[1].clone(),
			cars[1].clone(),
			cars[2].clone(),
			cars[2].clone()
		];
		this.cars.forEach(c=>{
			c.mutate();
		})
	}
}

function beginGame() {
	generation = new Generation();
	generation.newGeneration();
	
	var carIndex = 0;
	var score = 0;
	setInterval(interval, 3000/timeMultiplier);
	spawnCar();
	
	function interval(){
		if(!car) return;
		//calculate score
		if(car.bodies[0].position[0] > score + 1) {
			score = car.bodies[0].position[0];
			console.log('score', score);
		} else {
			//kill
			console.log('kill, last score %s', score);
			car.score = score;
			score = 0;
			spawnCar();
		}
	}
	
	function spawnCar() {
		if(car) {
			car.removeFromP2();
			car = null;
		}
		console.log('spawnCar', carIndex);
		car = generation.cars[carIndex++];
		if(!car) {
			//generation finished
			console.log('generation done');
			generation.newGeneration();
			console.log('new generation', generation.generation)
			carIndex = 0;
			spawnCar();
			return;
		}
		car.toP2();
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
var fixedTimeStep = 1 / 60, maxSubSteps = 15, lastTimeMilliseconds;
function animate(timeMilliseconds){
	requestAnimationFrame(animate);
	// Move physics bodies forward in time
	var timeSinceLastCall = 0;
	if(timeMilliseconds !== undefined && lastTimeMilliseconds !== undefined){
		timeSinceLastCall = (timeMilliseconds - lastTimeMilliseconds) / 1000;
	}
	world.step(fixedTimeStep, timeSinceLastCall*timeMultiplier, maxSubSteps);
	lastTimeMilliseconds = timeMilliseconds;
	
	if(cameraBody) {
		stage.position.x =	renderer.width/2 - cameraBody.position[0]*zoom + offsetX*zoom; // center at origin
		stage.position.y =	renderer.height/2 + cameraBody.position[1]*zoom + offsetY*zoom;
	}
	stage.scale.x =	 zoom;	// zoom in
	stage.scale.y = -zoom; // Note: we flip the y axis to make "up" the physics "up"
	
	updatePixiItemsFromP2World();
	
	renderer.render(stage);
}