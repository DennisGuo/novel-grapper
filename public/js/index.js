(function () {


    var $form = $('#form');
    var $btn = $('#btn-to-grap');
    var $progress = $('#progress');
    var $loading = $('#loading');
    var $contentView = $('#contentView');
    var $modalCategory = $('#categoryModal');


    var book, page, size = 20;

    init();

    function init() {

        loadHash();

        var dom = $(document);
        dom.on('click', '#btn-to-grap', toSearch)
        dom.on('click', '#categoryList li', toContent)
        dom.on('click', '#btn-grap', toGrap)
        dom.on('click', '.btn-download', toDownload)
        dom.on('click', '.btn-read', toRead)
        dom.on('click', '#btn-add-rule', toAddRule)
        dom.on('click', '#to-save-rule', toSaveRule)
        dom.on('click', '.btn-remove-rule', toRemoveRule)
        dom.on('click', '.btn-modify-rule', toModifyRule)


        window.addEventListener("hashchange", loadHash, false);
    }

    function toRemoveRule(e){
        var id = e.currentTarget.dataset.id;
        Api.removeRule(id,res=>{
            if(res.success){
                noti('success','删除规则成功！');
                loadRule();
            }else{
                noti('danger','删除规则失败：'+res.message);
            }
        })
    }
    function toModifyRule(e){
        var id = e.currentTarget.dataset.id;
    }

    function toAddRule(){
        $('#ruleModal').modal('show');
    }
    function toSaveRule(){
        var data = getFormData($('#ruleForm'));
        if(!data.domain){
            noti('warning','请填写站点域名');
            return;
        }
        Api.saveRule(data,res=>{
            if(res.success){
                noti('success','保存规则成功！');
                $('#ruleModal').modal('hide');
                loadRule();
            }else{
                noti('danger','保存规则失败！');
            }
        })
    }

    function loadHash() {
        var hash = document.location.hash;
        showPage(hash)
    }

    function showPage(hash) {
        var target, li;
        if (hash == '#book') {
            target = $('.page#book');
            li = $('a[href="#book"]').parent('li')
            loadBookList(0);
        } else if(hash == '#rule'){
            target = $('.page#rule');
            li = $('a[href="#rule"]').parent('li')
            loadRule();
        }else {
            target = $('.page#form');
            li = $('a[href="#"]').parent('li')
        }
        target.show().siblings().hide();
        li.addClass('active');
        $('.nav-item').not(li).removeClass('active');

    }

    function loadRule(){
        Api.getRule(res=>{
            if(res.success){
                var html = res.data.map(item=>{
                    return `<div class="card my-2">
                    <div class="card-header">
                        <h5 class="card-title">
                            ${item.domain}  
                            <div class="btn-group btn-group-sm float-right">
                                <button type="button" class="btn btn-secondary btn-modify-rule" data-id="${item.id}">修改</button>
                                <button type="button" class="btn btn-danger btn-remove-rule" data-id="${item.id}">删除</button>
                            </div>
                        </h5>
                    </div>
                    <div class="card-body">                     
                      <div class="card-text">
                        章节：<input class="form-control" value="${item.category}" readonly/> <br>
                        文章：<input class="form-control" value="${item.content}" readonly/> <br>
                        广告：<textarea rows="4" class="inline form-control" readonly>${item.ad}</textarea>
                      </div>
                    </div>
                  </div>`;
                });
                $('#rule-list').html(html.join(''));
            }else{
                noti('danger', '获取规则列表失败~')
            }
        });
    }

    function loadBookList(p) {
        Api.getBook(p, size, res => {
            if (res.success) {
                var total = res.data.total;
                var rows = res.data.rows;
                var html = rows.map(item => {                  
                    var percent = Math.floor(item.over / item.total * 100); 
                    return `<div class="list-group-item list-group-item-action">
                    <div class="d-flex w-100 justify-content-between">
                      <h5 class="mb-1">${item.title}</h5>
                      <small> 作者：${item.author}  共 ${item.total} 章 </small>
                    </div>
                    ${percent < 99 ?
                    `<div class="progress">
                        <div class="progress-bar  progress-bar-striped bg-warning progress-bar-animated"  style="width: ${percent}%" ></div>
                    </div>`:''}
                    <small>抓取进度 ${percent}% : ${item.over} / ${item.total} </small>
                    <div class="btn-group float-right btn-group-sm mt-1">
                        <button type="button" class="btn-read btn btn-outline-secondary">阅读</button>
                        <button type="button" class="btn-download btn ${percent == 100 ?'btn-outline-primary':''}" ${percent != 100 ? 'disabled':''} data-id="${item.id}">下载</button>
                    </div>
                  </div>`;
                });

                $('#book .list-group').html(html.length > 0 ? html.join('') : '<div class="text-center">还没有书籍数据哟~</div>');

                renderPage(p, total);

            } else {
                noti('danger', '获取书本列表失败~')
            }
        })
    }

    function toDownload(e){
        var id = e.currentTarget.dataset.id;
        var a = document.createElement('a');
        a.setAttribute('href','/download?id='+id);
        a.setAttribute('target','_blank')
        a.click();
    }
    function toRead(e){
        var id = e.currentTarget.dataset.id;
    }

    function noti(type, msg) {
        $.notify({
            message: msg,
        }, {
            type: type,
            placement: {
                from: "top",
                align: "center"
            },
        });
    }

    function renderPage(page, total) {
        $page = $('#page');
        if (total == 0) {
            $page.html('');
            $page.hide();
        } else {
            var html = [`<li class="page-item ${page==0?'disabled':''}" ><a class="page-link" href="javascript:page('pre')">上一页</a></li>`];

            var pageTotal = total % size == 0 ? total / size : (Math.floor(total/size) + 1);
            
            for(var i=1;i<pageTotal+1;i++){
                html.push(`<li class="page-item ${page==i?'disabled':''}"><a class="page-link" href="javascript:page(${i})">${i}</a></li>`)
            }

            html.push(`<li class="page-item ${page==pageTotal-1?'disabled':''}" ><a class="page-link" href="javascript:page('nxt')">下一页</a></li>`)
            $page.html(html.join(''));
            $page.show();
        }
    }

    function page(p){

    }

    function toSearch(e) {
        e.preventDefault();

        $btn.hide();
        $progress.removeClass('fade');

        var data = getFormData($form);

        Api.getCategory(data, function (res) {
            $btn.show();
            $progress.addClass('fade');
            if (res.success) {
                book = res.data;
                var rows = book.cheapter;
                var html = [];
                for (var i = 0; i < rows.length; i++) {
                    var item = rows[i];
                    html.push('<li class="pointer" data-url="' + item.link + '">' + item.title + '</li>');
                }
                $('#categoryList').html(html.join(''));
                $modalCategory.modal('show');
                $('#bookTitle').text('《' + book.title + '》共' + rows.length + '章');
                if (book.id) {
                    $btn.attr('data-id', book.id);
                    $btn.text('下载');
                } else {
                    $btn.attr('data-id', '');
                    $btn.text('开始抓取');
                }
                if (rows.length > 0) {
                    var one = rows[0];
                    getContent(one.link);
                }
            } else {
                task = null;
            }
        });
    }

    function toContent(e) {
        var url = e.currentTarget.dataset.url;
        getContent(url);
    }

    function getContent(link) {
        $loading.removeClass('fade');
        $contentView.hide();
        $('#categoryList').find('li[data-url="' + link + '"]').addClass('active').siblings().removeClass('active');
        var payload = {
            link: link,
        }
        Api.getContent(payload, renderContent)
    }

    function renderContent(res) {
        $loading.addClass('fade');
        $contentView.show();
        if (res.success) {
            var content = res.data;
            $contentView.text(content);
        }
    }

    function toGrap(e) {

        var id = e.currentTarget.dataset.id;
        if (id) {
            // 根据ID下载书

        } else {
            // 开启抓取书的任务
            Api.startGrap({ link: book.link }, res => {
                if (res.success) {
                    $modalCategory.modal('hide');
                    noti('success', '任务开启成功，请点击书本列表查看')
                    showPage('#book');
                } else {
                    noti('danger', '开启抓取书内容失败');
                }
            });

        }
    }

    function getFormData($form) {
        var unindexed_array = $form.serializeArray();
        var indexed_array = {};

        $.map(unindexed_array, function (n, i) {
            indexed_array[n['name']] = n['value'];
        });

        return indexed_array;
    }
}());