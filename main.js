var $ = document.querySelector.bind(document);
    var vjsParsed,
        video, 
        mediaSource;
        video = document.getElementById('video');
        video.controls = true;
        // MediaSource Web API: https://developer.mozilla.org/zh-CN/docs/Web/API/MediaSource
        mediaSource = new MediaSource(); 
        video.src = URL.createObjectURL(mediaSource);
    function logevent (event) {
      console.log(event);
    }
    
    window.addEventListener('message', function(event) {
      console.log(event.data);
      if(event.data["type"] ==="chunks"){

           var segment = event.data["bin"];
           transferFormat(segment);
      }
    });
  
    
    function transferFormat (data) {
 
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
      var segment = new Uint8Array(data); 
      var combined = false;
 
      var outputType = 'video';
      var remuxedSegments = [];
      var remuxedBytesLength = 0;
      var remuxedInitSegment = null;
 
      var transmuxer = new muxjs.mp4.Transmuxer({remux: false});
 
      transmuxer.on('data', function(event) {
        console.log(event);
        if (event.type === outputType) {
          remuxedSegments.push(event);
          remuxedBytesLength += event.data.byteLength;
          remuxedInitSegment = event.initSegment;
        }
      });
 
      transmuxer.on('done', function () {
        var offset = 0;
        var bytes = new Uint8Array(remuxedInitSegment.byteLength + remuxedBytesLength)
        bytes.set(remuxedInitSegment, offset);
        offset += remuxedInitSegment.byteLength;

        for (var j = 0, i = offset; j < remuxedSegments.length; j++) {
          bytes.set(remuxedSegments[j].data, i);
          i += remuxedSegments[j].byteLength;
        }
        remuxedSegments = [];
        remuxedBytesLength = 0;
     
        vjsParsed = muxjs.mp4.tools.inspect(bytes);
        console.log('transmuxed', vjsParsed);

        prepareSourceBuffer(combined, outputType, bytes);
      });
    
      transmuxer.push(segment); // 
    
      transmuxer.flush();  
    }

    function prepareSourceBuffer (combined, outputType, bytes) {
      var buffer;

    
      var codecsArray = ["avc1.64001f", "mp4a.40.5"];
    
      mediaSource.addEventListener('sourceopen', function () {
        mediaSource.duration = 0;
        if (combined) {
          buffer = mediaSource.addSourceBuffer('video/mp4;codecs="' + 'avc1.64001f,mp4a.40.5' + '"');
        } else if (outputType === 'video') {
          buffer = mediaSource.addSourceBuffer('video/mp4;codecs="' + codecsArray[0] + '"');
        } else if (outputType === 'audio') {
          buffer = mediaSource.addSourceBuffer('audio/mp4;codecs="' + (codecsArray[1] ||codecsArray[0]) + '"');
        }
    
        buffer.addEventListener('updatestart', logevent);
        buffer.addEventListener('updateend', logevent);
        buffer.addEventListener('error', logevent);
        video.addEventListener('error', logevent);

        // https://developer.mozilla.org/en-US/docs/Web/API/SourceBuffer/appendBuffer
        buffer.appendBuffer(bytes);
    
        // video.play();
      });
    };