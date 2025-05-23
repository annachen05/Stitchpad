
$(function() {
	var type = /(canvas|webgl|svg)/.test(url.type) ? url.type : 'svg';
	var elem = document.getElementById('stage');
	var two = new Two({
		type: Two.Types[type],
		fullscreen: true,
		autostart: true
	}).appendTo(elem);

	var turtleShepherd = new TurtleShepherd();

	var stitches = two.makeGroup();
	var lines = two.makeGroup();
	var isJump = false;
	var dragged = false;
	var interpolate = false;
	var dist_min = 8;
	var dist_max = 12;
	var grid_s = 50;

	// TODO: PAN/Zoom
	// TODO: plus pinch-to-zoom for mobile.

	var zui = new ZUI(two);
	zui.addLimits(0.06, 8);
	var scale = zui.scale;

	var x, y, line, mouse = new Two.Vector(), randomness = 2;
	var lastPos = null;

	createGrid(scale);

	var addPoint = function(pos) {
		var point = two.makeCircle(pos.x, pos.y, 1.5);
		stitches.add(point);
	};

	var addLine = function(pos1, pos2) {
		var line;
		var dist = Math.sqrt(
			Math.pow((pos1.x - pos2.x), 2) +
			Math.pow((pos1.y - pos2 .y ), 2)
		);

		if (isJump) {
			line = two.makeLine(pos1.x, pos1.y, pos2.x, pos2.y);
			line.noFill().stroke = '#f00';
			line.linewidth = 1;
			line.opacity = 0.5;
			lines.add(line);
			turtleShepherd.moveTo(pos1.x, -pos1.y, pos2.x, -pos2.y, false);
			toogleJump();
		} else {
      line = two.makeLine(pos1.x, pos1.y, pos2.x, pos2.y);
      line.noFill().stroke = '#333';
      line.linewidth = 2;
      lines.add(line);
      turtleShepherd.moveTo(pos1.x, -pos1.y, pos2.x, -pos2.y, true);
		}
	};

	var drag = function(e) {
			dragged = true;
			var pos =  new Two.Vector(e.clientX, e.clientY);
			pos = zui.clientToSurface(pos.x,pos.y);
			if (lastPos) {
				var dist = Math.sqrt( Math.pow((lastPos.x - pos.x), 2) + Math.pow((lastPos.y - pos.y ), 2) );
				if  (dist > dist_max && interpolate && !isJump) {
					p = lineInterpolate( lastPos, pos, dist_min, dist );
					for (var i = 0; i < p.length-1; i++) {
						addPoint(p[i+1]);
						addLine(p[i],p[i+1]);
						lastPos = p[i+1];
					}
				} else if (dist > dist_min) {
					addPoint(pos);
					addLine(lastPos, pos);
					lastPos = pos;
				}
			} else {
				addPoint(pos);
				lastPos = pos;
			}
	};

	var dragEnd = function(e) {
		var pos =  new Two.Vector(e.clientX, e.clientY);
		pos = zui.clientToSurface(pos.x,pos.y);
		//ransform="matrix(scaleX 0 0 scaleY x-scaleX*x y-scaleY*y)";

		if (!dragged) {
			if (lastPos) {
				var dist = Math.sqrt( Math.pow((lastPos.x - pos.x), 2) + Math.pow((lastPos.y - pos.y ), 2) );
				if  (dist > dist_max && interpolate && !isJump) {
					p = lineInterpolate( lastPos, pos, dist_min, dist );
					for (var i = 0; i < p.length-1; i++) {
						addPoint(p[i+1]);
						addLine(p[i],p[i+1]);
						lastPos = p[i+1];
					}
				} else {
					addLine(lastPos, pos);
					addPoint(pos);
					lastPos = pos;
				}
			} else {
				addPoint(pos);
				lastPos = pos;
			}
		}
		dragged = false;
		$(this)
		  .unbind('mousemove', drag)
		  .unbind('mouseup', dragEnd);
	};

	var touchDrag = function(e) {
		e.preventDefault();
		var touch = e.originalEvent.changedTouches[0];
		drag({
		  clientX: touch.pageX,
		  clientY: touch.pageY
		});
		return false;
	};

	var touchEnd = function(e) {
		e.preventDefault();
		var touch = e.originalEvent.changedTouches[0];
		dragEnd({
		  clientX: touch.pageX,
		  clientY: touch.pageY
		});
		$(this)
		  .unbind('touchmove', touchDrag)
		  .unbind('touchend', touchEnd);
		return false;
	};

	/*
	var pan = function(e) {
		var sf = zui.clientToSurface(e.deltaX, e.deltaY);
		zui.translateSurface(sf.x, sf.y);
		zui.updateSurface();
	};
	*/
	stage = $(two.renderer.domElement).parent();
	stage
	 .bind('mousedown', function(e) {
		if ((e.keyCode || e.which) == 1) {
			$(this)
			.bind('mousemove', drag)
			.bind('mouseup', dragEnd);
		} else {
			//$(this)
			//.bind('mousemove', pan);
			//.bind('mouseup', panEnd);
		}
	})
	 .bind('touchstart', function(e) {
		e.preventDefault();
		var touch = e.originalEvent.changedTouches[0];
		$(this)
			.bind('touchmove', touchDrag)
			.bind('touchend', touchEnd);
		return false;
	});

	var zoom = function(s, x, y) {
		zui.zoomBy(s, x, y);
		scale = zui.scale;
		createGrid(scale);
	};

	var resetView = function() {
		zui.reset();
		zoom(0.001,  two.width/2, two.width/2);
		zoom(-0.001,  two.width/2, two.width/2);
	};

	$(window).bind('mousewheel wheel', function(event) {
		var e = event.originalEvent;
		e.stopPropagation();
		e.preventDefault();
		dy = (e.wheelDeltaY || - e.deltaY) / 100;
		zoom(dy, e.clientX, e.clientY);
	});

	var scaleLast = 0;
	var mc = new Hammer(elem, {});
	mc.get('pinch').set({ enable: true });
	mc.on("pinch", function(event) {
		$('.mdl-dialog__title').html(event.scale);
		//if (Math.abs(event.scale - scaleLast) > 0.1) {
			dS = ((event.scale * 200) - 200) / 200;
			zui.zoomSet(event.scale, event.center.x, event.center.y);
			createGrid(zui.scale);
		//}
	});
	mc.on("pinchstart", function(e) {
		$("#stage")
			.unbind('touchmove', touchDrag)
			.unbind('touchend', touchEnd)
			.unbind('mousemove', drag)
			.unbind('mouseup', dragEnd);
	});
	mc.on("pinchend", function(e) {
		$(".mdl-layout-title").html(event.scale);

	});

	var closeDrawer = function () {
		if ( $(".mdl-layout__drawer").hasClass("is-visible") ) {
			$( 'div[class^="mdl-layout__obfuscator"]' ).trigger( "click" );
		}
	};

	var clear = function() {
		turtleShepherd.clear();
		two.clear();
		lines =  two.makeGroup();
		stitches = two.makeGroup();
		lastPos = null;
		closeDrawer();
	};

	var undo = function() {
		if (turtleShepherd.hasSteps()) {
			turtleShepherd.undoStep();
			lines.remove(_.last(lines.children));
			stitches.remove(_.last(stitches.children));
			lastPos = (_.last(stitches.children).translation);
		} else {
			clear();
		}
	};

	// TODO: Save
	var save = function (format, name) {
		name = name || "Stitchpad";

		switch (format) {
			case "exp":
				expUintArr = turtleShepherd.toEXP();
    			blob = new Blob([expUintArr], {type: 'application/octet-stream'});
    			saveAs(blob, name + '.exp');
				break;
		    case "dst":
				expUintArr = turtleShepherd.toDST(name);
				blob = new Blob([expUintArr], {type: 'application/octet-stream'});
				saveAs(blob, name + '.dst');
				break;
			case "svg":
				svgStr = turtleShepherd.toSVG();
			    blob = new Blob([svgStr], {type: 'text/plain;charset=utf-8'});
				saveAs(blob, name + '.svg');
				break;
			default:
				return;
		}
	};


	$('#ts-do-save-form').submit( function(e) {
		//save("submit me");
		name = $(this).find('#projectname').val() || "unnamed";
		format =  $(this).find('input[name=format]').filter(':checked').val();
		save(format,name);
		save_dialog.close();
		closeDrawer();
		return false;
	});


	$(window).bind('keydown', function(event) {
		if (!$('.ts-save-dialog').is(":visible")) {
			if (event.key == 'j') {
				toogleJump();
			}
			else if (event.key == 'i') {
				toogleInterpolate();
			}
			else if (event.key == 'g') {
				toogleGrid();
			}
			else if (event.key == 'c') {
				clear();
			}
			else if (event.key == '+') {
				zoom(0.05, two.width/2, two.height/2);
			}
			else if (event.key == '-') {
				zoom(-0.05, two.width/2, two.height/2);
			}
			else if (event.key == '=') {
				resetView();
			}
			else if (event.key == 's') {
				save_dialog.showModal();
				event.preventDefault();
			}
			else if (event.key == 'b') {
				load_image_dialog.showModal();
			}
			else if (event.key == 'z' && event.ctrlKey) {
				undo();
			}
		}
	});

	var toogleJump = function() {
		isJump = !isJump;
		if (isJump) {
			$(".ts-jump").addClass("mdl-button--accent");
		} else {
			$(".ts-jump").removeClass("mdl-button--accent");
		}
	};

	var toogleInterpolate = function() {
		interpolate = !interpolate;
		if (interpolate) {
			$(".ts-interpolate").addClass("mdl-button--accent");
		} else {
			$(".ts-interpolate").removeClass("mdl-button--accent");
		}
	};

	var toogleGrid = function() {
		$("#grid").toggle();
		if ($("#grid").is(":visible")) {
			$(".ts-grid i").html("grid_off");
		} else {
			$(".ts-grid i").html("grid_on");
		}
	};
  
  $(".ts-import").click ( function(e) {
    $( 'div[class^="mdl-layout__obfuscator"]' ).trigger( "click" );
    $('#file_import').trigger("click");    
	});

	$(".ts-clear").click ( function(e) {
		e.preventDefault();
		clear();
	});

	$(".ts-jump").click ( function(e) {
		toogleJump();
	});

	$(".ts-zoom-in").click ( function(e) {
		zoom(0.05, two.width/2, two.height/2);
	});

	$(".ts-zoom-out").click ( function(e) {
		zoom(-0.05, two.width/2, two.height/2);
	});

	$(".ts-reset-view").click ( function(e) {
		resetView();
	});

	$(".ts-interpolate").click ( function(e) {
		toogleInterpolate();
	});

	$(".ts-undo").click ( function(e) {
		undo();
	});

	$(".ts-grid").click ( function(e) {
		toogleGrid();
	});

	function createGrid(s) {
		var size = s * 50;
		var two = new Two({
		  type: Two.Types.canvas, width: size, height: size
		});

		var a = two.makeLine(two.width / 2, 0, two.width / 2, two.height);
		var b = two.makeLine(0, two.height / 2, two.width, two.height / 2);
		a.stroke = b.stroke = '#6dcff6';

		two.update();

		_.defer(function() {
			$("#grid").css({
				background: 'url(' + two.renderer.domElement.toDataURL('image/png') + ') 0 0 repeat',
				backgroundSize: size + 'px ' + size + 'px'
			});
		});
	}
  
  const dropArea = document.getElementById('stage');

  dropArea.addEventListener('dragover', (event) => {
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.dataTransfer.dropEffect = 'copy';
  });

  dropArea.addEventListener('drop', (event) => {
    handleFileSelection(event) 
  });
  
  document.getElementById('file_import').addEventListener('change', (event) => {
    handleFileSelection(event) 
  });
    

    
  function handleFileSelection(event) {

    event.stopPropagation();
    event.preventDefault();
    
    var fileList = event.dataTransfer ? event.dataTransfer.files : event.target.files;

    for (const file of fileList) {      
      if (!file.name.endsWith("dst")) {
        warn_dialog.showModal();
        return;
      } 
      const reader = new FileReader();    
      reader.addEventListener('load', (event) => {                
        content = new jDataView(event.target.result, 0, event.size);            
        turtleShepherd.fromDST(content);
        turtleShepherd.normalize();
        cache = turtleShepherd.cache;         
        two.clear();
        lines =  two.makeGroup();
        stitches = two.makeGroup();        
        last_point = false        
        for (i=0; i < cache.length; i++) {
          if (cache[i].cmd == "move") {            
            pos_x = (two.width - turtleShepherd.maxX)/2  + cache[i].x              
            pos_y = (two.height + turtleShepherd.maxY)/2 - cache[i].y            
            point = new Two.Vector(pos_x, pos_y);
            addPoint(point)
            if (last_point) {
              if(cache[i].penDown) {
                line = two.makeLine(last_point.x, last_point.y, point.x, point.y);
                    line.noFill().stroke = '#333';
                    line.linewidth = 2;
                    lines.add(line);
                } else {
                  line = two.makeLine(last_point.x, last_point.y, point.x, point.y);
                  line.noFill().stroke = '#f00';
                  line.linewidth = 1;
                  line.opacity = 0.5;
              }
            }
            last_point = point;
          }          
        }        
        lastPos = last_point;        
      });
      reader.addEventListener('progress', (event) => {
        if (event.loaded && event.total) {
          const percent = (event.loaded / event.total) * 100;
          console.log(`Progress: ${Math.round(percent)}`);
        }
      });      
      reader.readAsArrayBuffer(file);  
    };    
  };

});


// We are on cordova so we overwrite certain functions


document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady() {
    console.log(cordova.file);
	console.log(cordova.file.dataDirectory);
    console.log("we Are on cordova!");

	// owerwrite file save functions

	var errorHandler = function (fileName, e) {
	    var msg = '';

	    switch (e.code) {
	        case FileError.QUOTA_EXCEEDED_ERR:
	            msg = 'Storage quota exceeded';
	            break;
	        case FileError.NOT_FOUND_ERR:
	            msg = 'File not found';
	            break;
	        case FileError.SECURITY_ERR:
	            msg = 'Security error';
	            break;
	        case FileError.INVALID_MODIFICATION_ERR:
	            msg = 'Invalid modification';
	            break;
	        case FileError.INVALID_STATE_ERR:
	            msg = 'Invalid state';
	            break;
	        default:
	            msg = 'Unknown error';
	            break;
	    }
	    console.log('Error (' + fileName + '): ' + msg);
	};

	saveAs = function(blob, fileName) {
		console.log("save via cordova file plugin ");
		subDir = "Stitchpad";
        persistentFS=
			cordova.file.externalRootDirectory  ||
			cordova.file.externalDataDirectory ||
		 	cordova.file.documentsDirectory ||
			cordova.file.applicationStorageDirectory; //||cordova.file.DataDirectory||fileSystem.root.toURL();
		window.resolveLocalFileSystemURL(persistentFS, function (dirEntry) {
			dirEntry.getDirectory(subDir, { create: true }, function (directoryEntry) {
				directoryEntry.getFile(fileName, { create: true }, function (fileEntry) {
					fileEntry.createWriter(function (fileWriter) {
						fileWriter.onwriteend = function (e) {
							// for real-world usage, you might consider passing a success callback
							window.plugins.toast.showLongBottom('Saved to: ' + directoryEntry.toNativeURL()  + fileName,
							function(a){console.log('toast success: ' + a);},
								function(b){console.log('toast error: ' + b);});
							console.log('Write of file "' + fileName + '"" to  ' + directoryEntry.toNativeURL() + ' completed.');
						};
						fileWriter.onerror = function (e) {
							window.plugins.toast.showLongBottom('Write failed: ' + e.toString(),
							function(a){console.log('toast success: ' + a);},
								function(b){alert('toast error: ' + b);});
							// you could hook this up with our global error handler, or pass in an error callback
							console.log('Write failed: ' + e.toString());
						};
						fileWriter.write(blob);
					}, errorHandler.bind(null, fileName));
				}, errorHandler.bind(null, fileName));
			}, errorHandler.bind(null, fileName));
		}, errorHandler.bind(null, fileName));
	};
}
