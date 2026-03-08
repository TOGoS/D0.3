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
	 * @typedef {string} ColorString
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
	 * @property {RoomID} targetRoomId
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
	 * @typedef {string} RoomThingKey
	 * 
	 * @typedef Room
	 * @property {ColorString} [wallColor]
	 * @property {AABB3D} bounds
	 * @property {{[k:RoomThingKey]: RoomThing}} contents
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
	 * @param {Direction} d
	 * @return {Direction}
	*/
	function oppositeDirection(d) {
		switch(d) {
		case "down" : return "up";
		case "east" : return "west";
		case "north": return "south";
		case "south": return "north";
		case "up"   : return "down";
		case "west" : return "east";
		}
	}
	
	/**
	 * @param {Room} room
	 * @param {Direction} direction
	 * @return {Vec3D}
	 */
	function roomWallCenterPosition(room, direction) {
		const bounds = room.bounds;
		switch(direction) {
		case "down" : return {x: (bounds.minX+bounds.maxX)/2, y: (bounds.minY+bounds.maxY)/2, z: bounds.minZ};
		case "east" : return {x: bounds.maxX, y: (bounds.minY+bounds.maxY)/2, z: (bounds.minZ+bounds.maxZ)/2};
		case "north": return {x: (bounds.minX+bounds.maxX)/2, y: bounds.maxY, z: (bounds.minZ+bounds.maxZ)/2};
		case "south": return {x: (bounds.minX+bounds.maxX)/2, y: bounds.minY, z: (bounds.minZ+bounds.maxZ)/2};
		case "up"   : return {x: (bounds.minX+bounds.maxX)/2, y: (bounds.minY+bounds.maxY)/2, z: bounds.maxZ};
		case "west" : return {x: bounds.minX, y: (bounds.minY+bounds.maxY)/2, z: (bounds.minZ+bounds.maxZ)/2};
		}
	}
	
	/**
	 * @param {Vec3D} a
	 * @param {Vec3D} b
	 * @return {boolean}
	 */
	function vec3dEquals(a, b) {
		return a.x == b.x && a.y == b.y && a.z == b.z;
	}
	
	/**
	 * @type IconRenderer
	 */
	function renderHarold(ctx) {
		ctx.fillStyle = "orange";
		ctx.fillRect(-0.3, -0.3, 0.6, 0.6);
	}
	
	/** @type {AABB3D} */
	const STD_ROOM_BOUNDS = {
		minX: -1.5, minY: -1.5, minZ: -0.5,
		maxX:  1.5, maxY:  1.5, maxZ:  0.5,
	};
	
	/**
	 * @param {Dungeon} dungeon
	 * @param {(thing:Thing)=>boolean} filter
	 * @return {{roomId:RoomID, roomThingKey:string, roomThing:RoomThing}[]}
	 */
	function findThings(dungeon, filter) {
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
		 
		ctx.strokeStyle = room.wallColor ?? 'white';
		ctx.lineWidth = wallThickness;
		ctx.strokeRect(
			room.bounds.minX + wallThickness/2, room.bounds.minY + wallThickness/2,
			(room.bounds.maxX - room.bounds.minX) - wallThickness,
			(room.bounds.maxY - room.bounds.minY) - wallThickness
		);
		
		// draw 1-yard "hole" at each link's outPosition (cover the wall with room background)
		// This is a hack.
		// Replace with more robust room drawing allowing for layering later.
		ctx.fillStyle = 'black';
		for (const link of room.links) {
			const p = link.outPosition;
			
			const blobBounds = {
				minX: Math.max(room.bounds.minX, p.x-0.5) - 0.1,
				minY: Math.max(room.bounds.minY, p.y-0.5) - 0.1,
				maxX: Math.min(room.bounds.maxX, p.x+0.5) + 0.1,
				maxY: Math.min(room.bounds.maxY, p.y+0.5) + 0.1,
			}
			
			ctx.fillRect(
				blobBounds.minX, blobBounds.minY,
				blobBounds.maxX - blobBounds.minX,
				blobBounds.maxY - blobBounds.minY,
			);
		}
		
		for( const k in room.contents ) {
			const roomThing = room.contents[k];
			ctx.save();
			ctx.translate(roomThing.position.x, roomThing.position.y);
			roomThing.thing.icon.render.call(roomThing.thing.icon, ctx);
			ctx.restore();
		}
	}
	
	/**
	 * Generate a uniqe thing key for the given room.
	 * If the indicated base key is not already used, it will be returned.
	 * 
	 * @param {Room} room
	 * @param {RoomThingKey} [baseKey]
	 */
	function generateThingKey(room, baseKey) {
		if( baseKey != undefined && !room.contents[baseKey] ) return baseKey;
		
		if( baseKey == undefined ) baseKey = "thing";
		
		let i = 1;
		while( room.contents[baseKey+"_"+i] ) i++;
		return baseKey+"_"+i;
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
		ctx.scale(perspective.scale, -perspective.scale);
		
		for( const link of room.links ) {
			const destRoom = dungeon.rooms[link.targetRoomId];
			ctx.save();	
			ctx.translate(link.outPosition.x - link.inPosition.x, link.outPosition.y - link.inPosition.y);
			drawRoom(ctx, destRoom);
			ctx.restore();
		}
		
		drawRoom(ctx, room);

		ctx.restore();
	}
	
	/** @type Dungeon */
	const theDungeon = {
		rooms: {
			"room000": {
				bounds: STD_ROOM_BOUNDS,
				contents: {
					"harold": {
						position: {x:0, y:0, z:0},
						thing: {
							id: "harold",
							pickuppable: false,
							icon: {
								render: renderHarold
							}
						}
					}
				},
				links: []
			},
			"room001": {
				bounds: STD_ROOM_BOUNDS,
				contents: {},
				links: []
			},
			"room002": {
				wallColor: "green",
				bounds: STD_ROOM_BOUNDS,
				contents: {},
				links: []
			}
		}
	};
	
	addBidirectionalLink(theDungeon, "room000", "west", "room001", "east");
	addBidirectionalLink(theDungeon, "room001", "south", "room002", "north");
	addBidirectionalLink(theDungeon, "room002", "south", "room000", "north");
	
	/**
	 * @param {Dungeon} dungeon
	 * @param {RoomID} roomAId
	 * @param {Direction} directionA
	 * @param {RoomID} roomBId
	 * @param {Direction} directionB
	 */
	function addBidirectionalLink(dungeon, roomAId, directionA, roomBId, directionB) {
		const roomA = dungeon.rooms[roomAId];
		const roomB = dungeon.rooms[roomBId];
		const roomALinkPosition = roomWallCenterPosition(roomA, directionA);
		const roomBLinkPosition = roomWallCenterPosition(roomB, directionB);
		
		roomA.links.push({
			outPosition: roomALinkPosition,
			outDirection: directionA,
			targetRoomId: roomBId,
			inPosition: roomBLinkPosition,
			inDirection: directionB,
		});
		roomB.links.push({
			outPosition: roomBLinkPosition,
			outDirection: directionB,
			targetRoomId: roomAId,
			inPosition: roomALinkPosition,
			inDirection: directionA,
		});
	}
	
	/**
	 * @typedef MoveCommand
	 * @property {"move"} type
	 * @property {Direction} direction
	 * 
	 * @typedef {MoveCommand} Command
	 * 
	 */
	
	class DungeonUI {
		/** @type {undefined|Dungeon} */
		#dungeon;
		/** @type {undefined|ThingID} */
		#characterId;
		/** @type {HTMLCanvasElement} */
		#canvas;
		/**
		 * @param {HTMLCanvasElement} canvas
		 */
		constructor(canvas) {
			this.#canvas = canvas;
		}
		
		#renderRequested = false;
		
		render() {
			this.#renderRequested = false;
			
			this.#canvas.width = this.#canvas.clientWidth;
			this.#canvas.height = this.#canvas.clientHeight;
		
			const ctx = cast(ctx => ctx instanceof CanvasRenderingContext2D, this.#canvas.getContext('2d'));
			
			const characterSearchResult = this.#dungeon == undefined || this.#characterId == undefined ? [] :
				findThings(this.#dungeon, (thing) => thing.id == this.#characterId);
			/** @type {DungeonPerspective|undefined} */
			const perspective = characterSearchResult.reduce(
				(acc, entry) => acc || {
					dungeon: this.#dungeon,
					roomId: entry.roomId,
					thingId: entry.roomThing.thing.id,
					position: entry.roomThing.position,
					scale: 36
				},
				/** @type {DungeonPerspective|undefined} */ (undefined)
			);
			
			if( this.#dungeon && perspective ) drawDungeon(ctx, this.#dungeon, perspective);
			
			ctx.fillStyle = 'white';
			ctx.font = "12px monospace";
			ctx.fillText(`Position: ${perspective ? `${JSON.stringify(perspective.roomId)}, ${JSON.stringify(perspective.position)}` : 'Not found'}`, 10, ctx.canvas.height - 20);
		}
		
		#requestRender() {
			if( this.#renderRequested ) return;
			window.requestAnimationFrame(this.render.bind(this));
			this.#renderRequested = true;
		}
		#dungeonUpdated() {
			this.#requestRender();
		}
		
		/**
		 * @param {KeyboardEvent} event
		 * @return {Command[]}
		*/
		#decodeKeyEvent(event) {
			/** @type {Command[]} */
			const commands = [];
			switch(event.key) {
				case "w": commands.push({type: "move", direction: "north"}); break;
				case "a": commands.push({type: "move", direction: "west"}); break;
				case "s": commands.push({type: "move", direction: "south"}); break;
				case "d": commands.push({type: "move", direction: "east"}); break;
				case "q": commands.push({type: "move", direction: "up"}); break;
				case "e": commands.push({type: "move", direction: "down"}); break;
			}
			return commands;
		}
		
		#findCharacter() {
			return this.#dungeon == undefined || this.#characterId == undefined ? [] :
				findThings(this.#dungeon, (thing) => thing.id == this.#characterId);
		}
		
		/**
		 * @param {RoomID} fromRoomId
		 * @param {RoomThingKey} fromThingKey
		 * @param {RoomID} toRoomId
		 * @param {Vec3D} toPosition
		 * 
		 * @return {boolean} true if the thing was moved
		 * 
		 * Hmm, maybe this should be a more generic 'replace room thing' function
		 */
		#moveRoomThing(fromRoomId, fromThingKey, toRoomId, toPosition) {
			if( !this.#dungeon ) throw new Error("No dungeon loaded");
			const room = this.#dungeon.rooms[fromRoomId];
			if( !room ) throw new Error(`No such room: ${fromRoomId}`);
			const roomThing = room.contents[fromThingKey];
			if( !roomThing ) throw new Error(`No such thing in room ${fromRoomId} at index ${fromThingKey}`);			
			
			if( fromRoomId == toRoomId && vec3dEquals(roomThing.position, toPosition) ) return false; // No move needed
			
			const toRoom = this.#dungeon.rooms[toRoomId];
			if( !toRoom ) throw new Error(`No such room: ${toRoomId}`);
			
			delete room.contents[fromThingKey];
			const toThingKey = generateThingKey(toRoom, fromThingKey);
			toRoom.contents[toThingKey] = {
				position: toPosition,
				thing: roomThing.thing
			};
			
			this.#dungeonUpdated();
			
			return true;
		}
		
		/**
		 * @param {ThingID} characterId
		 * @param {Direction} direction
		 */
		#attemptMoveCharacter(characterId, direction) {
			if( !this.#dungeon ) return;
			const characters = this.#findCharacter();
			for( const character of characters ) {
				const room = this.#dungeon.rooms[character.roomId];
				if( !room ) throw new Error(`findThings returned entry with invalid room: ${character.roomId}`);
				const link = room.links.find(link => link.outDirection == direction);
				if( !link ) continue; // No exit in that direction, try next character match
				
				// TODO: Allow positioning within room
				return this.#moveRoomThing(character.roomId, character.roomThingKey, link.targetRoomId, {x:0,y:0,z:0});
			}
		}
		
		/**
		 * @param {Command} command
		 */
		#doCommand(command) {
			switch(command.type) {
				case "move": {
					if( !this.#characterId ) return;
					console.log(`Moving ${command.direction}`);
					this.#attemptMoveCharacter(this.#characterId, command.direction);
				}
			}
		}
		
		/** @param {KeyboardEvent} event */
		#handleKeyDown(event) {
			console.log("Key down:", event.key);
			const commands = this.#decodeKeyEvent(event);
			for( const command of commands ) this.#doCommand(command);
		}
		
		/**
		 * @param {HTMLCanvasElement} canvas
		 * @returns {DungeonUI}
		 */
		static init(canvas) {
			const ui = new DungeonUI(cast(el => el instanceof HTMLCanvasElement, canvas));
			
			window.addEventListener('resize', () => ui.#requestRender());
			window.addEventListener('keydown', ui.#handleKeyDown.bind(ui));
			
			ui.#requestRender();
			
			return ui;
		}
		
		/** @type {ThingID|undefined} */
		get characterId() {
			return this.#characterId;
		}
		/** @param {ThingID|undefined} characterId */
		set characterId(characterId) {
			this.#characterId = characterId;
			this.#requestRender();
		}
		
		/** @type {undefined|Dungeon} */
		get dungeon() {
			return this.#dungeon;
		}
		/** @param {Dungeon} dungeon */
		set dungeon(dungeon) {
			this.#dungeon = dungeon;
			this.#requestRender();
		}
	}
	
	const dungeonUi = DungeonUI.init(cast(el => el instanceof HTMLCanvasElement, document.getElementById('the-view')));
	dungeonUi.dungeon = theDungeon;
	dungeonUi.characterId = "harold";
})();
