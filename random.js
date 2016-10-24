function Random(seed) {
	this.seed = seed || Math.floor(Math.random() * 1000000);
	this.initialSeed = this.seed;
}

Random.prototype.next = function() {
	const m = Math.pow(2, 32), a = 1103515245, c = 12345;
	this.seed = (a * this.seed + c) % m;
	return this.seed;
}
