// @ts-check

(function() {
	/**
	 * @template T
	 * @param {(x:any) => x is T} check
	 * @param {any} val
	 * @returns {T}
	 */
	function cast(check, val) {
		if( check(val) ) {
			return val;
		} else {
			throw new Error("Oh no, this isn't what I expected: "+val);
		}
	}
	
	window.requestAnimationFrame(() => {
		
		/** @type HTMLCanvasElement */
		const theView = cast(x => x instanceof HTMLCanvasElement, document.getElementById('the-view'));
		
		theView.width = theView.clientWidth;
		theView.height = theView.clientHeight;
		
		const ctx = cast(ctx => ctx instanceof CanvasRenderingContext2D, theView.getContext('2d'));
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, 120, 120);
		ctx.fillStyle = 'red';
		ctx.fillRect(0, 0, 100, 100);
		
		console.log("ASd");
	});
	
	
})();
