THREE.OBJLoader2.WW.WWLoader2Proxy = (function () {

	function WWOBJLoader2Proxy( params ) {
		this.init( params );
	}

	WWOBJLoader2Proxy.prototype.init = function ( webWorkerName ) {
		// check worker support first
		if ( window.Worker === undefined ) throw "This browser does not support web workers!";

		this.webWorkerName = webWorkerName;

		this.instanceNo = 0;
		this.worker = null;
		this.workerCode = null;
		this.debug = false;

		this.sceneGraphBaseNode = null;
		this.modelName = 'none';
		this.validated = false;
		this.running = false;
		this.requestTerminate = false;

		this.callbacks = {
			progress: null,
			completedLoading: null,
			errorWhileLoading: null,
			materialsLoaded: null,
			meshLoaded: null,
			director: {
				completedLoading: null,
				errorWhileLoading: null
			}
		};

		this.manager = THREE.DefaultLoadingManager;
		this.fileLoader = new THREE.FileLoader( this.manager );
		this.mtlLoader = null;

		this.dataAvailable = false;
		this.objAsArrayBuffer = null;
		this.fileObj = null;
		this.pathObj = null;

		this.fileMtl = null;
		this.mtlAsString = null;
		this.texturePath = null;

		this.materials = [];
		this.counter = 0;
	};

	WWOBJLoader2Proxy.prototype.setDebug = function ( enabled ) {
		this.debug = enabled;
	};

	WWOBJLoader2Proxy.prototype.getWebWorkerName = function () {
		return this.webWorkerName;
	};

	WWOBJLoader2Proxy.prototype.getModelName = function () {
		return this.modelName;
	};

	WWOBJLoader2Proxy.prototype.registerProgressCallback = function ( callbackProgress ) {
		if ( callbackProgress != null ) this.callbacks.progress = callbackProgress;
	};

	WWOBJLoader2Proxy.prototype.registerHookCompletedLoading = function ( callbackCompletedLoading ) {
		if ( callbackCompletedLoading != null ) this.callbacks.completedLoading = callbackCompletedLoading;
	};

	WWOBJLoader2Proxy.prototype.registerHookMaterialsLoaded = function ( callbackMaterialsLoaded ) {
		if ( callbackMaterialsLoaded != null ) this.callbacks.materialsLoaded = callbackMaterialsLoaded;
	};

	WWOBJLoader2Proxy.prototype.registerHookMeshLoaded = function ( callbackMeshLoaded ) {
		if ( callbackMeshLoaded != null ) this.callbacks.meshLoaded = callbackMeshLoaded;
	};

	WWOBJLoader2Proxy.prototype.buildWebWorkerCode = function ( existingWorkerCode ) {
		if ( existingWorkerCode != null ) this.workerCode = existingWorkerCode;
		if ( this.workerCode == null ) {

			console.time( 'buildWebWorkerCode' );
			var buildObject = function ( fullName, object ) {
				var objectString = fullName + ' = {\n';
				var part;
				for ( var name in object ) {

					part = object[ name ];
					if ( typeof( part ) === 'string' || part instanceof String ) {

						part = part.replace( '\n', '\\n' );
						part = part.replace( '\r', '\\r' );
						objectString += '\t' + name + ': "' + part + '",\n';

					} else if ( part instanceof Array ) {

						objectString += '\t' + name + ': [' + part + '],\n';

					} else if ( Number.isInteger( part ) ) {

						objectString += '\t' + name + ': ' + part + ',\n';

					} else if ( typeof part === 'function' ) {

						objectString += '\t' + name + ': ' + part + ',\n';

					}

				}
				objectString += '}\n';

				return objectString;
			};

			var buildSingelton = function ( fullName, internalName, object ) {
				var objectString = fullName + ' = (function () {\n\n';

				var constructorString = object.prototype.constructor.toString();
				constructorString = constructorString.replace( 'function e', 'function ' + internalName );
				objectString += constructorString;

				var funcString;
				var objectPart;
				for ( var name in object.prototype ) {

					objectPart = object.prototype[ name ];
					if ( typeof objectPart === 'function' ) {

						funcString = objectPart.toString();
						funcString = funcString.replace( 'new e', 'new ' + internalName );
						objectString += '\t' + internalName + '.prototype.' + name + ' = ' + funcString + ';\n\n';

					}

				}
				objectString += '\treturn ' + internalName + ';\n';
				objectString += '})();\n';

				return objectString;
			};

			this.workerCode = '';
			this.workerCode += '/**\n';
			this.workerCode += '  * This code was re-constructed for web worker usage\n';
			this.workerCode += '  */\n\n';
			this.workerCode += 'if ( THREE === undefined ) {\n';
			this.workerCode += '\tvar THREE = {}\n';
			this.workerCode += '};\n\n';
			this.workerCode += 'THREE.OBJLoader2 = {\n';
			this.workerCode += '\tconsts: null,\n';
			this.workerCode += '\tParser: null,\n';
			this.workerCode += '\tRawObject: null,\n';
			this.workerCode += '\tRawObjectDescription: null,\n';
			this.workerCode += '\tWW: {\n';
			this.workerCode += '\t\tWWOBJLoader: null,\n';
			this.workerCode += '\t\tWWMeshCreator: null,\n';
			this.workerCode += '\t\tWWOBJLoaderRef: null,\n';
			this.workerCode += '\t\tWWOBJLoaderRunner: null\n';
			this.workerCode += '\t}\n';
			this.workerCode += '};\n\n';

			this.workerCode += buildObject( 'THREE.OBJLoader2.consts', THREE.OBJLoader2.consts );

			this.workerCode += buildSingelton( 'THREE.OBJLoader2.Parser', 'Parser', THREE.OBJLoader2.Parser );
			this.workerCode += buildSingelton( 'THREE.OBJLoader2.RawObject', 'RawObject', THREE.OBJLoader2.RawObject );
			this.workerCode += buildSingelton( 'THREE.OBJLoader2.RawObjectDescription', 'RawObjectDescription', THREE.OBJLoader2.RawObjectDescription );

			this.workerCode += buildSingelton( 'THREE.OBJLoader2.WW.WWOBJLoader', 'WWOBJLoader', THREE.OBJLoader2.WW.WWOBJLoader );
			this.workerCode += buildSingelton( 'THREE.OBJLoader2.WW.WWMeshCreator', 'WWMeshCreator', THREE.OBJLoader2.WW.WWMeshCreator );
			this.workerCode += 'THREE.OBJLoader2.WW.WWOBJLoaderRef = new THREE.OBJLoader2.WW.WWOBJLoader();\n\n';
			this.workerCode += buildSingelton( 'THREE.OBJLoader2.WW.WWOBJLoaderRunner', 'WWOBJLoaderRunner', THREE.OBJLoader2.WW.WWOBJLoaderRunner );
			this.workerCode += 'new THREE.OBJLoader2.WW.WWOBJLoaderRunner();\n\n';

			console.timeEnd( 'buildWebWorkerCode' );
		}

		return this.workerCode;
	};

	WWOBJLoader2Proxy.prototype.validate = function () {
		if ( this.validated ) return;
		if ( this.worker == null ) {

			this.buildWebWorkerCode();
			var blob = new Blob( [ this.workerCode ], { type: 'text/plain' } );
			this.worker = new Worker( window.URL.createObjectURL( blob ) );

			var scope = this;
			var scopeFunction = function ( e ) {
				scope.receiveWorkerMessage( e );
			};
			this.worker.addEventListener( 'message', scopeFunction, false );

		}

		this.sceneGraphBaseNode = null;
		this.modelName = 'none';
		this.validated = true;
		this.running = true;
		this.requestTerminate = false;

		this.fileLoader = ( this.fileLoader == null ) ? new THREE.FileLoader( this.manager ) : this.fileLoader;
		this.mtlLoader = ( this.mtlLoader == null ) ?  new THREE.MTLLoader() : this.mtlLoader;

		this.dataAvailable = false;
		this.fileObj = null;
		this.pathObj = null;
		this.fileMtl = null;
		this.texturePath = null;

		this.objAsArrayBuffer = null;
		this.mtlAsString = null;

		this.materials = [];
		var defaultMaterial = new THREE.MeshStandardMaterial( { color: 0xDCF1FF } );
		defaultMaterial.name = 'defaultMaterial';
		this.materials[ defaultMaterial.name ] = defaultMaterial;

		this.counter = 0;
	};

	WWOBJLoader2Proxy.prototype.prepareRun = function ( params ) {
		this.validate();
		this.dataAvailable = params.dataAvailable;
		this.modelName = params.modelName;
		console.time( 'WWOBJLoader2Proxy' );
		if ( this.dataAvailable ) {

			// fast-fail on bad type
			if ( ! ( params.objAsArrayBuffer instanceof ArrayBuffer || params.objAsArrayBuffer instanceof Uint8Array ) ) {
				throw 'Provided input is not of type arraybuffer! Aborting...';
			}

			this.worker.postMessage( {
				cmd: 'init',
				debug: this.debug
			} );

			this.objAsArrayBuffer = params.objAsArrayBuffer;
			this.mtlAsString = params.mtlAsString;

		} else {

			// fast-fail on bad type
			if ( ! ( typeof( params.fileObj ) === 'string' || params.fileObj instanceof String ) ) {
				throw 'Provided file is not properly defined! Aborting...';
			}

			this.worker.postMessage( {
				cmd: 'init',
				debug: this.debug
			} );

			this.fileObj = params.fileObj;
			this.pathObj = params.pathObj;
			this.fileMtl = params.fileMtl;

		}
		this.pathTexture = params.pathTexture;
		this.sceneGraphBaseNode = params.sceneGraphBaseNode;
	};

	WWOBJLoader2Proxy.prototype.run = function () {
		var scope = this;
		var processLoadedMaterials = function ( materialCreator ) {
			var materialCreatorMaterials = [];
			var materialNames = [];
			if ( materialCreator != null ) {

				materialCreator.preload();
				materialCreatorMaterials = materialCreator.materials;
				for ( var materialName in materialCreatorMaterials ) {

					if ( materialCreatorMaterials.hasOwnProperty( materialName ) ) {

						materialNames.push( materialName );
						scope.materials[ materialName ] = materialCreatorMaterials[ materialName ];

					}

				}

			}
			scope.worker.postMessage( {
				cmd: 'setMaterials',
				materialNames: materialNames
			} );

			if ( scope.callbacks.materialsLoaded != null ) scope.materials = scope.callbacks.materialsLoaded( scope.materials );

			if ( scope.dataAvailable && scope.objAsArrayBuffer ) {

				scope.worker.postMessage({
					cmd: 'run',
					objAsArrayBuffer: scope.objAsArrayBuffer
				}, [ scope.objAsArrayBuffer.buffer ] );

			} else {

				var refPercentComplete = 0;
				var percentComplete = 0;
				var output;
				var onLoad = function ( objAsArrayBuffer ) {

					scope.announceProgress( 'Running web worker!' );
					scope.objAsArrayBuffer = new Uint8Array( objAsArrayBuffer );
					scope.worker.postMessage( {
						cmd: 'run',
						objAsArrayBuffer: scope.objAsArrayBuffer
					}, [ scope.objAsArrayBuffer.buffer ] );

				};

				var onProgress = function ( event ) {
					if ( ! event.lengthComputable ) return;

					percentComplete = Math.round( event.loaded / event.total * 100 );
					if ( percentComplete > refPercentComplete ) {

						refPercentComplete = percentComplete;
						output = 'Download of "' + scope.fileObj + '": ' + percentComplete + '%';
						console.log( output );
						scope.announceProgress( output );

					}
				};

				var onError = function ( event ) {
					output = 'Error occurred while downloading "' + scope.fileObj + '"';
					console.error( output + ': ' + event );
					scope.announceProgress( output );
					scope.finalize( 'error' );

				};

				scope.fileLoader.setPath( scope.pathObj );
				scope.fileLoader.setResponseType( 'arraybuffer' );
				scope.fileLoader.load( scope.fileObj, onLoad, onProgress, onError );
			}
			console.timeEnd( 'Loading MTL textures' );
		};

		if ( this.dataAvailable ) {

			processLoadedMaterials( ( this.mtlAsString != null ) ? this.mtlLoader.parse( this.mtlAsString ) : null );

		} else {

			if ( this.fileMtl == null ) {

				processLoadedMaterials();

			} else {

				this.mtlLoader.setPath( this.pathTexture );
				this.mtlLoader.load( this.fileMtl, processLoadedMaterials );

			}

		}
	};

	WWOBJLoader2Proxy.prototype.receiveWorkerMessage = function ( event ) {
		var payload = event.data;

		switch ( payload.cmd ) {
			case 'objData':

				this.counter ++;
				var bufferGeometry = new THREE.BufferGeometry();

				bufferGeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( payload.vertices ), 3 ) );
				if ( payload.normals !== null ) {

					bufferGeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( payload.normals ), 3 ) );

				} else {

					bufferGeometry.computeVertexNormals();

				}
				if ( payload.uvs !== null ) {

					bufferGeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( payload.uvs ), 2 ) );

				}

				var materialDescriptions = payload.materialDescriptions;
				var materialDescription;
				var material;
				var materialName;
				var createMultiMaterial = payload.multiMaterial;
				var multiMaterials = [];

				for ( var key in materialDescriptions ) {

					materialDescription = materialDescriptions[ key ];
					material = this.materials[ materialDescription.name ];

					if ( materialDescription.default ) {

						material = this.materials[ 'defaultMaterial' ];

					} else if ( materialDescription.clone ) {

						materialName = material.name + '_flat';
						var materialClone = this.materials[ materialName ];
						if ( ! materialClone ) {

							materialClone = material.clone();
							materialClone.name = materialName;
							materialClone.shading = THREE.FlatShading;
							this.materials[ materialName ] = name;

						}

					} else if ( ! material ) {

						material = this.materials[ 'defaultMaterial' ];

					}
					if ( createMultiMaterial ) multiMaterials.push( material );

				}

				if ( createMultiMaterial ) {

					material = new THREE.MultiMaterial( multiMaterials );
					var materialGroups = payload.materialGroups;
					var materialGroup;
					for ( var key in materialGroups ) {

						materialGroup = materialGroups[ key ];
						bufferGeometry.addGroup( materialGroup.start, materialGroup.count, materialGroup.index );

					}

				}
				if ( this.callbacks.meshLoaded !== null ) {

					var materialOverride = this.callbacks.meshLoaded( payload.meshName, material );
					if ( materialOverride != null ) material = materialOverride;

				}
				var mesh = new THREE.Mesh( bufferGeometry, material );
				mesh.name = payload.meshName;
				this.sceneGraphBaseNode.add( mesh );

				var output = '(' + this.counter + '): ' + payload.meshName;
				this.announceProgress( 'Adding mesh', output );
				break;

			case 'complete':

				console.timeEnd( 'WWOBJLoader2Proxy' );
				if ( payload.msg != null ) {

					this.announceProgress( payload.msg );

				} else {

					this.announceProgress( '' );

				}

				this.finalize( 'complete' );
				break;

			case 'report_progress':
				this.announceProgress( '', payload.output );
				break;

			default:
				console.error( 'Received unknown command: ' + payload.cmd );
				break;

		}
	};

	WWOBJLoader2Proxy.prototype.finalize = function ( reason ) {
		this.running = false;
		if ( reason === 'complete' ) {

			if ( this.callbacks.completedLoading != null ) this.callbacks.completedLoading( this.webWorkerName, this.modelName, this.instanceNo, this.requestTerminate );
			if ( this.callbacks.director.completedLoading != null ) this.callbacks.director.completedLoading( this.webWorkerName, this.modelName, this.instanceNo, this.requestTerminate );

		} else if ( reason === 'error' ) {

			if ( this.callbacks.errorWhileLoading != null ) this.callbacks.errorWhileLoading( this.webWorkerName, this.modelName, this.instanceNo, this.requestTerminate );
			if ( this.callbacks.director.errorWhileLoading != null ) this.callbacks.director.errorWhileLoading( this.webWorkerName, this.modelName, this.instanceNo, this.requestTerminate );

		}
		this.validated = false;

		if ( this.requestTerminate ) {
			this.terminate();
		}
	};

	WWOBJLoader2Proxy.prototype.setRequestTerminate = function () {
		this.requestTerminate = true;
	};

	WWOBJLoader2Proxy.prototype.terminate = function () {
		if ( this.worker != null ) {

			if ( this.running ) throw 'Unable to gracefully terminate worker as it is currently running!';

			this.worker.terminate();
			this.worker = null;
			this.workerCode = null;
			this.finalize( 'terminate' );

		}
		this.fileLoader = null;
		this.mtlLoader = null;
	};

	WWOBJLoader2Proxy.prototype.announceProgress = function ( baseText, text ) {
		var output = "";
		if ( baseText !== null && baseText !== undefined ) {

			output = baseText;

		}
		if ( text !== null && text !== undefined ) {

			output = output + " " + text;

		}
		if ( this.callbacks.progress !== null ) {

			this.callbacks.progress( output );

		}
		if ( this.debug ) {

			console.log( output );

		}
	};

	WWOBJLoader2Proxy.prototype.addMaterial = function ( name, material ) {
		if ( material.name !== name ) material.name = name;
		this.materials[ name ] = material;
	};

	WWOBJLoader2Proxy.prototype.getMaterial = function ( name ) {
		var material = this.materials[ name ];
		if ( ! material ) material = null;
		return material;
	};

	return WWOBJLoader2Proxy;

})();