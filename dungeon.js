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
	
	/**
	 * Let's say right-handed coordinate system, where, generally,
	 * +x = east, +y = north, +z = up
	 * 
	 * For screen coordinates (i.e. as used for drawing)
	 * We'll stick to +x = right, +y = down, +z = into the screen;
	 * i.e. Y and Z are inverted from world coordinates.
	 * But directions in this game are supposed to be relative, anyway.
	 * 
	 * @typedef {string} RoomID
	 * @typedef {string} ThingID
	 * @typedef {number&{unit?:"YardsPerPixel"}} YardsPerPixel
	 * 
	 * @typedef {(this:Icon, ctx:CanvasRenderingContext2D)=>void} IconRenderer
	 * 
	 * @typedef Icon
	 * @property {IconRenderer} render
	 * 
	 * @typedef Vec3D
	 * @property {number} x
	 * @property {number} y
	 * @property {number} z
	 *
	 * @typedef AABB3D
	 * @property {number} minX
	 * @property {number} minY
	 * @property {number} minZ
	 * @property {number} maxX
	 * @property {number} maxY
	 * @property {number} maxZ
	 * 
	 * @typedef {"north"|"south"|"east"|"west"|"up"|"down"} Direction
	 * 
	 * @typedef RoomLink
	 * @property {Vec3D} outPosition
	 * @property {Direction} outDirection
	 * @property {RoomID} destRoomId
	 * @property {Vec3D} inPosition
	 * @property {Direction} inDirection
	 * 
	 * @typedef Thing
	 * @property {ThingID} id
	 * @property {boolean} pickuppable
	 * @property {Icon} icon
	 * 
	 * @typedef RoomThing
	 * @property {Vec3D} position
	 * @property {void} [orientation]
	 * @property {Thing} thing
	 * 
	 * @typedef Room
	 * @property {AABB3D} bounds
	 * @property {RoomThing[]} contents
	 * @property {RoomLink[]} links
	 * 
	 * @typedef Dungeon
	 * @property {{[k:RoomID]: Room}} rooms
	 * 
	 * @typedef DungeonPerspective
	 * @property {RoomID} roomId
	 * @property {ThingID} [thingId]
	 * @property {Vec3D} position
	 * @property {YardsPerPixel} scale
	 * // Possibly add orientation later
	 */
	
	/**
	 * @type IconRenderer
	 */
	function renderHarold(ctx) {
		ctx.fillStyle = "orange";
		ctx.fillRect(-0.5, -0.5, 1, 1);
	}
	
	/** @type {AABB3D} */
	const STD_ROOM_BOUNDS = {
		minX: -1.5, minY: -1.5, minZ: -0.5,
		maxX:  1.5, maxY:  1.5, maxZ:  0.5,
	};
	
	/**
	 * 
	 * @param {Dungeon} dungeon 
	 * @param {(thing:Thing)=>boolean} filter
	 * @return {{roomId:RoomID, roomThingKey:string, roomThing:RoomThing}[]}
	 */
	function findThing(dungeon, filter) {
		/** @type {{roomId:RoomID, roomThingKey:string, roomThing:RoomThing}[]} */
		const rez = [];
		for( const roomId in dungeon.rooms ) {
			const room = dungeon.rooms[roomId];
			for( const roomThingKey in room.contents ) {
				/** @type {RoomThing} */
				const roomThing = room.contents[roomThingKey];
				if( filter(roomThing.thing) ) {
					rez.push({roomId, roomThingKey, roomThing});
				}
			}
		}
		return rez;
	}
	
	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {Room} room
	 */
	function drawRoom(ctx, room) {
		ctx.fillStyle = 'black';
		ctx.fillRect(
			room.bounds.minX, room.bounds.minY,
			room.bounds.maxX - room.bounds.minX,
			room.bounds.maxY - room.bounds.minY
		);
		
		const wallThickness = 1/8; // 4.5 inches
		 
		ctx.strokeStyle = 'white';
		ctx.lineWidth = wallThickness;
		ctx.strokeRect(
			room.bounds.minX + wallThickness/2, room.bounds.minY + wallThickness/2,
			(room.bounds.maxX - room.bounds.minX) - wallThickness,
			(room.bounds.maxY - room.bounds.minY) - wallThickness
		);
		
		// draw 1-yard "hole" at each link's outPosition (cover the wall with room background)
		ctx.fillStyle = 'black';
		for (const link of room.links) {
			const p = link.outPosition;
			ctx.fillRect(p.x - 0.5, p.y - 0.5, 1, 1);
		}
		
		for( const roomThing of room.contents ) {
			ctx.save();
			ctx.translate(roomThing.position.x, roomThing.position.y);
			roomThing.thing.icon.render.call(roomThing.thing.icon, ctx);
			ctx.restore();
		}
	}
	
	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {Dungeon} dungeon
	 * @param {DungeonPerspective} perspective
	 */
	function drawDungeon(ctx, dungeon, perspective) {
		
		const room = dungeon.rooms[perspective.roomId];
		
		ctx.save();
		
		ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2);
		ctx.scale(perspective.scale, perspective.scale);
		
		drawRoom(ctx, room);

		for( const link of room.links ) {
			const destRoom = dungeon.rooms[link.destRoomId];
			ctx.save();	
			ctx.translate(link.outPosition.x - link.inPosition.x, link.outPosition.y - link.inPosition.y);
			drawRoom(ctx, destRoom);
			ctx.restore();
		}
		
		ctx.restore();
	}
	
	/** @type Dungeon */
	const theDungeon = {
		rooms: {
			"room000": {
				bounds: STD_ROOM_BOUNDS,
				contents: [
					{
						position: {x:0, y:0, z:0},
						thing: {
							id: "harold",
							pickuppable: false,
							icon: {
								render: renderHarold
							}
						}
					}
				],
				links: [
					{
						outPosition: {x:1.5, y:0,z:0},
						outDirection: "east",
						destRoomId: "room001",
						inPosition: {x:-1.5, y:0,z:0},
						inDirection: "west",
					}
				]
			},
			"room001": {
				bounds: STD_ROOM_BOUNDS,
				contents: [],
				links: [
					{
						outPosition: {x:0, y:-1.5, z:0},
						outDirection: "south",
						destRoomId: "room000",
						inPosition: {x:0, y:1.5, z:0},
						inDirection: "north",
					}
				]
			},
		}
	};

	function render() {
		/** @type HTMLCanvasElement */
		const theView = cast(x => x instanceof HTMLCanvasElement, document.getElementById('the-view'));
		
		theView.width = theView.clientWidth;
		theView.height = theView.clientHeight;
		
		const ctx = cast(ctx => ctx instanceof CanvasRenderingContext2D, theView.getContext('2d'));
		
		const haroldSR = findThing(theDungeon, (thing) => thing.id == "harold");	
		/** @type {DungeonPerspective|undefined} */
		const perspective = haroldSR.reduce(
			(acc, entry) => acc || {
				dungeon: theDungeon,
				roomId: entry.roomId,
				thingId: entry.roomThing.thing.id,
				position: entry.roomThing.position,
				scale: 24
			},
			/** @type {DungeonPerspective|undefined} */ (undefined)
		);
		
		if( perspective ) drawDungeon(ctx, theDungeon, perspective);
		
		ctx.fillStyle = 'white';
		ctx.font = "12px monospace";
		ctx.fillText(`Position: ${perspective ? `${JSON.stringify(perspective.roomId)}, ${JSON.stringify(perspective.position)}` : 'Not found'}`, 10, ctx.canvas.height - 20);
	};

	function requestRender() {
		window.requestAnimationFrame(render);
	}

	window.addEventListener('resize', requestRender);

	requestRender();
})();
