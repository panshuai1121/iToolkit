<itk-modal>
    <div class="itk-modal-dialog" style='width:{width}; height:{height}'>
        <div class="itk-modal-title">
            <span>{ title }</span>
            <div class="itk-modal-close-wrap" onclick={ close }>
                <div class="itk-modal-close"></div>
            </div>
        </div>
        <div class="itk-modal-container">
           <yield>
        </div>
        <div class="itk-modal-footer">
           <button class="itk-cancle-btn" onclick={ close }>{ cancelText || '取消' }</button>
           <button class="itk-submit-btn" onclick={ confirm }>{ submitText || '确认' }</button>
        </div>
    </div>

    var self = this;
    var config = self.opts.opts || self.opts;
    var EL = self.root;
    for (i in config) {
        self[i] = config[i];
    }

    config.width = (typeof config.width === 'string' && config.width.match('px')) ? config.width : config.width + 'px';
    config.height = (typeof config.height === 'string' && config.height.match('px')) ? config.height : config.height + 'px'
    self.width = config.width || '600px';
    self.height = config.height || 'auto';
    self.cancleText = config.cancleText || '取消';
    self.submitText = config.submitText || '确认';

    self.on('mount', function() {
        var container = self.root.querySelector('.itk-modal-container');
        var head = self.root.querySelector('.itk-modal-title');
        var foot = self.root.querySelector('.itk-modal-footer');
        if (self.hideFooter) {
            foot.style.display = 'none';
        }
        var headHeight = parseInt(window.getComputedStyle(head, null).height.replace('px', ''));
        var footHeight = parseInt(window.getComputedStyle(foot, null).height.replace('px', ''));
        if (config.height) {
            container.style.height = (parseInt(self.height) - footHeight - headHeight - 2) + 'px';
        }
        //高度存在时，计算container的高度
    })

    if (document.querySelector("[modal-open-target='" + self.root.id + "']")) {
        document.querySelector("[modal-open-target='" + self.root.id + "']").onclick = function() {
            self.root.style.display = 'block';
            self.onOpen && self.onOpen();
        }
    }

    self.root.open = function() {
        self.root.style.display = 'block';
        self.onOpen && self.onOpen();
    }

    self.close = self.root.close = function() {
        self.root.style.display = 'none';
        self.onClose && self.onClose();
    }

    self.loadData = self.root.loadData = function(newData, colName){
        colName = colName || 'data';
        self[colName] = newData;
        self.update();
    }

    self.confirm = self.root.confirm = function(e) {
        self.onSubmit && self.onSubmit();
    }

    // document.querySelector("[modal-close-target='" + self.root.id + "']").onclick = function() {
    //     self.root.style.display = 'none';
    // }
</itk-modal>
