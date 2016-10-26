"use strict"
var renderer, stage, container, graphics, zoom,
	world, boxShape, boxBody, planeBody, planeShape, car, carBody, w1circle, w1;

var offsetX = 0;
var offsetY = 0;

var heightMap = generateHeightMap(123, 200);
init();
animate();

function generateHeightMap(seed, size) {
	var r = new Random(seed);
	var arr = Array(size);
	for(var i=0;i<size;i++) {
		if(i < 10)
			arr[i] = 0;
		else if(i < size / 4)
			arr[i] = (r.next() % 3);
		else if(i < size / 2)
			arr[i] = (r.next() % 6);
		else
			arr[i] = (r.next() % 10);
	}
	arr[0] = 10;
	return arr;
}

function init(){
	// Init p2.js
	const GROUND = 1<<0;
	const CAR = 1<<1;
	
	world = new p2.World();
	// Add a box
	boxShape = new p2.Box({ width: 2, height: 1 });
	boxShape.collisionGroup = CAR;
	boxShape.collisionMask = GROUND;
	boxBody = new p2.Body({
		mass:1,
		position:[0,5],
		angularVelocity:1
	});
	boxBody.addShape(boxShape);
	world.addBody(boxBody);
	// Add a plane
	// planeShape = new p2.Plane();
	// planeBody = new p2.Body({ position:[0,-1] });
	// planeBody.addShape(planeShape);
	// world.addBody(planeBody);
	// Pixi.js zoom level
	zoom = 25;
	// Initialize the stage
	renderer =	PIXI.autoDetectRenderer(600, 400),
	// stage = new PIXI.Stage(0xFFFFFF);
	// We use a container inside the stage for all our content
	// This enables us to zoom and translate the content
	// container = new PIXI.DisplayObjectContainer(),
	container = new PIXI.Container(),
	// stage.addChild(container);
	// Add the canvas to the DOM
	document.body.appendChild(renderer.view);
	renderer.backgroundColor = 0xffffff;
	// Add transform to the container
	container.position.x =	renderer.width/2 + offsetX; // center at origin
	container.position.y =	renderer.height/2 + offsetY;
	container.scale.x =	 zoom;	// zoom in
	container.scale.y = -zoom; // Note: we flip the y axis to make "up" the physics "up"
	// Draw the box.
	graphics = new PIXI.Graphics();
	graphics.beginFill(0xff0000);
	graphics.drawRect(-boxShape.width/2, -boxShape.height/2, boxShape.width, boxShape.height);
	// Add the box to our container
	// container.addChild(graphics);
	
	//add height map
	const step = 5;
	var heightfieldShape = new p2.Heightfield({
		heights: heightMap,
		elementWidth: step, // Distance between the data points in X direction
		angle: Math.PI / 2
	});
	heightfieldShape.collisionGroup = GROUND;
	heightfieldShape.collisionMask = CAR;
	
	var heightfieldBody = new p2.Body({position:[-step*2,0], mass: 0});
	heightfieldBody.addShape(heightfieldShape);
	world.addBody(heightfieldBody);
	
	var ground = new PIXI.Graphics();
	const lineWidth = 0.25;
	ground.lineStyle(lineWidth, 0x000000, 1);
	ground.moveTo(-step*2, 10);
	for(var i=0;i<heightMap.length;i++){
		ground.lineTo(i*step-step*2, heightMap[i] - 0.5 * lineWidth);
	}
	container.addChild(ground);
	
	(function(){
		car = new PIXI.Container();
		var chase = [
			1,
			1,
			1,
			1
		]

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
		
		carBody = new p2.Body({position: [0, 2.5], mass: 5});
		carBody.fromPolygon(polygon);
		
		carBody.shapes[0].collisionGroup = CAR;
		carBody.shapes[0].collisionMask = GROUND;
		
		world.addBody(carBody);
		var centerOfMass = carBody.shapes[0].centerOfMass;
		
		var graphic = new PIXI.Graphics();
		graphic.beginFill(0xff0000, 0.5);
		var t;
		for(var s=0;s<carBody.shapes.length;s++) {
			t = carBody.shapes[s];
			if(t instanceof p2.Convex) {
				graphic.moveTo(t.vertices[0][0], t.vertices[0][1]);
				for(var i=0;i<t.vertices.length;i++) {
					graphic.lineTo(t.vertices[i][0], t.vertices[i][1])
				}
			} else {
				console.error('can not render', carBody.shapes[s]);
			}
		}
		graphic.endFill();
		car.addChild(graphic);
		container.addChild(car);
		
		
		var w1Shape = new p2.Circle({radius: 0.5});
		w1 = new p2.Body({position: [
			carBody.shapes[0].vertices[0][0] + carBody.position[0],
			carBody.shapes[0].vertices[0][1] + carBody.position[1]
		], mass: 1});
		w1.addShape(w1Shape);
		w1Shape.collisionGroup = CAR;
		w1Shape.collisionMask = GROUND;
		
		world.addBody(w1);
		console.log(carBody, w1);
		var revolute = new p2.RevoluteConstraint(carBody, w1, {
			localPivotA: [
				carBody.shapes[0].vertices[0][0],
				carBody.shapes[0].vertices[0][1]
			],
			localPivotB: [0, 0],
			collideConnected: false
		});
		
		world.addConstraint(revolute);
		
		graphic = new PIXI.Graphics();
		graphic.beginFill(0x00ff00, 0.5);
		graphic.drawCircle(0, 0, 0.5);
		graphic.moveTo(0, 0);
		graphic.lineStyle(0.1, 0x000000, 1);
		graphic.lineTo(0.5, 0);
		container.addChild(graphic);
		w1circle = graphic;
	})();
}
// Animation loop
function animate(t){
	t = t || 0;
	requestAnimationFrame(animate);
	// Move physics bodies forward in time
	world.step(1/60);
	
	container.position.x =	renderer.width/2 - (boxBody.position[0]*zoom + offsetX*zoom); // center at origin
	container.position.y =	renderer.height/2 + boxBody.position[1]*zoom + offsetY*zoom;
	container.scale.x =	 zoom;	// zoom in
	container.scale.y = -zoom; // Note: we flip the y axis to make "up" the physics "up"
	
	// Transfer positions of the physics objects to Pixi.js
	// graphics.position.x = boxBody.position[0];
	// graphics.position.y = boxBody.position[1];
	// graphics.rotation = boxBody.angle;
	
	car.position.x = carBody.position[0];
	car.position.y = carBody.position[1];
	car.rotation = carBody.angle;
	
	w1circle.position.x = w1.position[0];
	w1circle.position.y = w1.position[1];
	w1circle.rotation = w1.angle;
	// Render scene
	// renderer.render(stage);
	renderer.render(container);
}