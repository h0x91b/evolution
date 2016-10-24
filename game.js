"use strict"
console.log('game.js');

var renderer, stage, world, ctx;
var b2Vec2 = Box2D.Common.Math.b2Vec2,
	b2AABB = Box2D.Collision.b2AABB,
	b2BodyDef = Box2D.Dynamics.b2BodyDef,
	b2Body = Box2D.Dynamics.b2Body,
	b2FixtureDef = Box2D.Dynamics.b2FixtureDef,
	b2Fixture = Box2D.Dynamics.b2Fixture,
	b2World = Box2D.Dynamics.b2World,
	b2MassData = Box2D.Collision.Shapes.b2MassData,
	b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape,
	b2CircleShape = Box2D.Collision.Shapes.b2CircleShape,
	b2DebugDraw = Box2D.Dynamics.b2DebugDraw,
	b2MouseJointDef =  Box2D.Dynamics.Joints.b2MouseJointDef,
	b2RevoluteJointDef =  Box2D.Dynamics.Joints.b2RevoluteJointDef;

initPIXI();
initBox2D();

requestAnimationFrame(animate);

function initPIXI() {
	//Create the renderer
	renderer = new PIXI.CanvasRenderer(256, 256);
	renderer.view.style.position = "absolute";
	renderer.view.style.display = "block";
	renderer.autoResize = true;
	renderer.resize(window.innerWidth, window.innerHeight);

	//Add the canvas to the HTML document
	document.body.appendChild(renderer.view);

	//Create a container object called the `stage`
	stage = new PIXI.Container();

	//Tell the `renderer` to `render` the `stage`
	renderer.render(stage);
}

function initBox2D() {
	var worldAABB = new b2AABB();
	worldAABB.lowerBound.Set(-1000, -1000);
	worldAABB.upperBound.Set(1000, 1000);
	
	var gravity = new b2Vec2(0, 100);
	var doSleep = true;
	world = new b2World(gravity, doSleep);
	
	// addRigidBody(null, true, 200, 150, 25, 37, 0.5);
	
	addVertArray(null, 50, 50, [[0,0], [10,0], [0,20]])
	addVertArray(null, 51, 25, [[0,0], [20,0], [0,20]])
	addEdge(null, 0, 350, 300, 400)
	addEdge(null, 300, 400, 600, 300)
	
	makeCar();
}

function makeCar() {
	var chase = addRigidBody2({
		dynamic: true,
		x: 200,
		y: 150,
		width: 25,
		height: 10,
		density: 0.5
	});
	
	var wheel1 = addCircle({
		x: 212.5,
		y: 155,
		radius: 5,
		density: 0.5
	})
	
	var wheel2 = addCircle({
		x: 200-12.5,
		y: 155,
		radius: 5,
		density: 0.5
	})
	
	var revJointDef = new b2RevoluteJointDef();
	revJointDef.Initialize(wheel1.GetBody(), chase.GetBody(), wheel1.GetBody().GetWorldCenter());
	revJointDef.enableMotor = true;
	revJointDef.maxMotorTorque = 7500;
	revJointDef.motorSpeed = -5000;
	world.CreateJoint(revJointDef);
	
	revJointDef.Initialize(wheel2.GetBody(), chase.GetBody(), wheel2.GetBody().GetWorldCenter());
	revJointDef.enableMotor = true;
	revJointDef.maxMotorTorque = 7500;
	revJointDef.motorSpeed = -5000;
	world.CreateJoint(revJointDef);
}

function initBox2DDebug() {
	ctx = renderer.context;
	if(!ctx) return;
	var debugDraw = new b2DebugDraw();
	debugDraw.SetSprite(ctx);
	// debugDraw.SetDrawScale(30.0);
	debugDraw.SetFillAlpha(0.5);
	debugDraw.SetLineThickness(1.0);
	debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
	world.SetDebugDraw(debugDraw);
}

function animate() {
	requestAnimationFrame(animate);
	
	world.Step(1/60, 10, 10);
	
	//pixi render
	//renderer.render(stage);
	
	// world.DebugDraw();
	if(!ctx) {
		renderer.render(stage);
		initBox2DDebug();
	} else {
		world.DrawDebugData();
		world.ClearForces();
	}
}

function addRigidBody2(opts) {
	// определение формы тела
	var shapeDef = new b2FixtureDef();
	shapeDef.shape = new b2PolygonShape;
	// размеры (из-за особенностей реализации Box2d, ополовиниваем размеры)
	shapeDef.shape.SetAsBox(opts.width * 0.5, opts.height * 0.5);
	// определение тела
	var bodyDef = new b2BodyDef();
	if(!!opts.dynamic)
		bodyDef.type = b2Body.b2_dynamicBody;
	else
		bodyDef.type = b2Body.b2_staticBody;
	bodyDef.position.Set(opts.x, opts.y);
	// если тело не статическое (имеет плотность)
	if (opts.density) {
		shapeDef.density = opts.density;
	}
	// трение
	shapeDef.friction = 0.4;
	// упругость
	shapeDef.restitution = 0.3;
	// немного повернем
	bodyDef.rotation = 0.8;
	
	var body = world.CreateBody(bodyDef).CreateFixture(shapeDef);
	// приколотим спрайт к телу
	body.m_userData = opts.data;
	return body;
}

function addCircle(opts) {
	// определение формы тела
	var shapeDef = new b2FixtureDef();
	shapeDef.shape = new b2CircleShape(opts.radius);
	// определение тела
	var bodyDef = new b2BodyDef();
	bodyDef.type = b2Body.b2_dynamicBody;
	bodyDef.position.Set(opts.x, opts.y);
	// если тело не статическое (имеет плотность)
	if (opts.density) {
		shapeDef.density = opts.density;
	}
	// трение
	shapeDef.friction = 0.4;
	// упругость
	shapeDef.restitution = 0.3;
	// немного повернем
	bodyDef.rotation = 0.8;
	
	var body = world.CreateBody(bodyDef).CreateFixture(shapeDef);
	// приколотим спрайт к телу
	body.m_userData = opts.data;
	return body;
}

function addEdge(userData, x1, y1, x2, y2) {
	// определение формы тела
	var shapeDef = new b2FixtureDef();
	shapeDef.shape = new b2PolygonShape;
	shapeDef.shape.SetAsEdge(new b2Vec2(x1, y1), new b2Vec2(x2, y2))
	// определение тела
	var bodyDef = new b2BodyDef();
	bodyDef.type = b2Body.b2_staticBody;
	// bodyDef.position.Set(x, y);
	// плотность
	shapeDef.density = 0.5;
	// трение
	shapeDef.friction = 0.4;
	// упругость
	shapeDef.restitution = 0.3;
	// немного повернем
	bodyDef.rotation = 0.8;
	var body = world.CreateBody(bodyDef).CreateFixture(shapeDef);
	// приколотим спрайт к телу
	body.m_userData = userData;
	return body;
}

function addVertArray(userData, x, y, arr) {
	// определение формы тела
	var shapeDef = new b2FixtureDef();
	shapeDef.shape = new b2PolygonShape;
	shapeDef.shape.SetAsArray(arr.map(a=>{
		return new b2Vec2(a[0], a[1])
	}), arr.length)
	// определение тела
	var bodyDef = new b2BodyDef();
	bodyDef.type = b2Body.b2_dynamicBody;
	bodyDef.position.Set(x, y);
	// плотность
	shapeDef.density = 0.5;
	// трение
	shapeDef.friction = 0.4;
	// упругость
	shapeDef.restitution = 0.5;
	// немного повернем
	bodyDef.rotation = 0.8;
	var body = world.CreateBody(bodyDef).CreateFixture(shapeDef);
	// приколотим спрайт к телу
	body.m_userData = userData;
	return body;
}