var Api = {
    getCategory:function(payload,callback){
        this.post('/category',payload,callback);
    },
    getContent:function(payload,callback){
        this.post('/content',payload,callback);
    },
    startGrap:function(payload,callback){
        this.post('/start',payload,callback);
    },
    getBook(page,size,callback){
        var url = `/book?page=${page}&size=${size}`;
        this.get(url,callback);
    },
    get(url,callback){
        this.ajax('GET',url,{},callback);
    },
    post(url,payload,callback){
        this.ajax('POST',url,payload,callback);
    },
    ajax(type,url,data,success,dataType){
        $.ajax({
            type: type||"GET",
            url: url,
            data: data,
            success: success,
            dataType: dataType||'json'
          });
    },
}