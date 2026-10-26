/*
 * CRMEB [CRMEB赋能开发者，助力企业发展]
 * Copyright (c) 2016~2026 https://www.crmeb.com. Original notices and license retained.
 * ALSVID adaptation of src/pages/product/productList/index.vue:
 * native Vue 2 / Element UI layout, product list/editor, ALSVID authenticated API and PostgreSQL proposals.
 */
(function(){
  'use strict';
  var Vue=window.Vue;
  Vue.use(window.ELEMENT); Vue.config.productionTip=false;
  var locales=[{id:'zh',name:'中文'},{id:'de',name:'德语'},{id:'en',name:'英语'}];
  function empty(){return{code:'',title:{zh:'',de:'',en:''},description:{zh:'',de:'',en:''},
    referenceImage:'',price:'',status:'DRAFT',version:1};}
  function decimal(minor){return minor===null?'':String(Math.floor(minor/100))+'.'+String(minor%100).padStart(2,'0');}
  function minor(value){
    if(value.trim()==='')return null;
    if(!/^(0|[1-9][0-9]{0,6})(\.[0-9]{1,2})?$/.test(value))throw new Error('方案价最多填写两位小数');
    var parts=value.split('.'),result=Number(parts[0])*100+Number((parts[1]||'').padEnd(2,'0'));
    if(!Number.isSafeInteger(result)||result>100000000)throw new Error('方案价超出范围');
    return result;
  }
  async function api(path,method,body){
    var response=await fetch('/admin/commerce-lab/api/products'+path,{
      method:method,credentials:'same-origin',headers:{'content-type':'application/json'},
      body:body===undefined?undefined:JSON.stringify(body)
    });
    var result;try{result=await response.json();}catch(e){throw new Error('后台响应异常，请稍后重试');}
    if(!response.ok){
      var messages={401:'请先登录 Admin，再重新打开本页',403:'当前账号没有操作权限',409:'资料已变化或编码重复，请刷新核对后再保存'};
      throw new Error(messages[response.status]||result.message||'暂时无法保存或读取');
    }
    return result.data;
  }
  async function imageApi(id,method,version,file){
    var headers={'x-product-version':String(version)};
    if(file){headers['content-type']=file.type;headers['x-upload-filename']=encodeURIComponent(file.name);}
    var response=await fetch('/admin/commerce-lab/api/products/'+id+'/image',{
      method:method,credentials:'same-origin',headers:headers,body:file||undefined
    });
    var result;try{result=await response.json();}catch(error){throw new Error('图片服务响应异常，请稍后重试');}
    if(!response.ok){
      var messages={400:'请检查图片格式和文件名称',401:'请先登录 Admin',403:'当前账号没有图片操作权限',
        409:'商品已变化，请刷新后重新操作',413:'图片不能超过 5 MiB',503:'图片存储暂不可用，请稍后重试'};
      throw new Error(messages[response.status]||result.message||'暂时无法保存图片');
    }
    return result.data;
  }
  new Vue({
    el:'#app',
    data:function(){return{locales:locales,artFrom:{page:1,limit:20,query:''},tableList:[],total:0,
      loading:false,saving:false,uploadTarget:null,errorMsg:'',dialogVisible:false,dialogWidth:'760px',editId:null,form:empty()};},
    mounted:function(){this.resize();window.addEventListener('resize',this.resize);this.load();},
    beforeDestroy:function(){window.removeEventListener('resize',this.resize);},
    methods:{
      resize:function(){this.dialogWidth=window.innerWidth<800?'96%':'760px';},
      label:function(status){return{DRAFT:'草稿',PUBLISHED:'已发布到独立产品页',ARCHIVED:'已归档'}[status]||status;},
      image:function(row){if(row.hasCustomImage)return '/admin/commerce-lab/api/products/'+row.id+'/image?v='+row.version;
        return row.referenceImage==='FC1'?'/home/original/fc1-product.webp':
        row.referenceImage==='FC2'?'/products/fc2/side-studio-1536.webp':null;},
      price:function(row){return row.proposedPriceMinor===null?'待填写':'€ '+decimal(row.proposedPriceMinor)+'（方案价）';},
      load:async function(){
        this.loading=true;this.errorMsg='';
        try{
          var params=new URLSearchParams({page:String(this.artFrom.page),limit:String(this.artFrom.limit),query:this.artFrom.query});
          var result=await api('?'+params,'GET');
          if(!result||!Array.isArray(result.items)||typeof result.total!=='number')throw new Error('商品数据格式异常');
          this.tableList=result.items;this.total=result.total;
        }catch(error){this.errorMsg=error.message;}finally{this.loading=false;}
      },
      search:function(){this.artFrom.page=1;this.load();},
      reset:function(){this.artFrom.query='';this.artFrom.page=1;this.load();},
      chooseImage:function(row){
        if(this.saving)return;this.uploadTarget={id:row.id,version:row.version};
        this.$refs.imageFile.value='';this.$refs.imageFile.click();
      },
      uploadImage:async function(event){
        var file=event.target.files&&event.target.files[0],target=this.uploadTarget;
        if(!file||!target)return;
        if(['image/jpeg','image/png','image/webp'].indexOf(file.type)<0||file.size<1||file.size>5*1024*1024){
          this.$message.error('请选择 5 MiB 以内的 JPEG、PNG 或 WebP 图片');return;
        }
        if(file.name.length>180){this.$message.error('图片文件名称过长，请缩短后上传');return;}
        this.saving=true;
        try{await imageApi(target.id,'POST',target.version,file);this.$message.success('主图已保存，发布状态保持不变');await this.load();}
        catch(error){this.$message.error(error.message);}
        finally{this.saving=false;this.uploadTarget=null;event.target.value='';}
      },
      removeImage:async function(row){
        if(this.saving)return;this.saving=true;
        try{await imageApi(row.id,'DELETE',row.version);this.$message.success('已移除上传主图，使用所选参考图');await this.load();}
        catch(error){this.$message.error(error.message);}finally{this.saving=false;}
      },
      create:function(){this.editId=null;this.form=empty();this.dialogVisible=true;},
      edit:function(row){this.editId=row.id;this.form={code:row.code,title:Object.assign({},row.title),
        description:Object.assign({},row.description),referenceImage:row.referenceImage||'',
        price:decimal(row.proposedPriceMinor),status:row.status,version:row.version};this.dialogVisible=true;},
      uppercaseCode:function(){this.form.code=this.form.code.toUpperCase();},
      fields:function(){return{title:this.form.title,description:this.form.description,
        referenceImage:this.form.referenceImage||null,proposedPriceMinor:minor(this.form.price)};},
      save:async function(){
        if(this.saving)return;this.saving=true;
        try{
          var value=this.fields();
          if(this.editId){value.expectedVersion=this.form.version;value.status=this.form.status;await api('/'+this.editId,'PATCH',value);}
          else{value.code=this.form.code;await api('','POST',value);}
          this.dialogVisible=false;this.$message.success('已保存到独立实验区');await this.load();
        }catch(error){this.$message.error(error.message);}finally{this.saving=false;}
      },
      publish:async function(row){
        if(this.saving)return;this.saving=true;
        try{
          await api('/'+row.id,'PATCH',{title:row.title,description:row.description,referenceImage:row.referenceImage,
            proposedPriceMinor:row.proposedPriceMinor,expectedVersion:row.version,status:row.status==='PUBLISHED'?'DRAFT':'PUBLISHED'});
          this.$message.success('发布状态已保存');await this.load();
        }catch(error){this.$message.error(error.message);}finally{this.saving=false;}
      }
    },
    template:`<div class="article-manager">
      <input ref="imageFile" type="file" accept="image/jpeg,image/png,image/webp" @change="uploadImage" hidden aria-label="上传商品图片">
      <header class="lab-heading"><div><small>ALSVID · CRMEB</small><h1>独立商城商品管理</h1></div>
        <a href="https://www.alsvidbike.com/zh/shop-preview/catalog" target="_blank" rel="noopener">打开独立产品页（新窗口）</a></header>
      <el-alert title="本区为独立方案比较。方案价、参考图片和发布状态不代表正式售价、库存或量产规格；付款仍未开放。"
        type="info" :closable="false" show-icon></el-alert>
      <el-card shadow="never" class="ivu-mt">
        <el-form :inline="true" @submit.native.prevent="search" class="search-form">
          <el-form-item label="商品搜索"><el-input v-model="artFrom.query" placeholder="名称或实验编码" clearable maxlength="120"></el-input></el-form-item>
          <el-form-item><el-button type="primary" @click="search" :loading="loading">查询</el-button>
            <el-button @click="reset">重置</el-button></el-form-item>
        </el-form>
      </el-card>
      <el-alert v-if="errorMsg" :title="errorMsg" type="error" :closable="false" class="ivu-mt"></el-alert>
      <el-card shadow="never" class="ivu-mt">
        <div class="table-toolbar"><strong>商品列表（{{total}}）</strong>
          <el-button type="primary" @click="create" :disabled="saving">添加实验商品</el-button>
          <el-button @click="load" :loading="loading">刷新</el-button></div>
        <div class="table-scroll"><el-table :data="tableList" v-loading="loading" empty-text="暂无实验商品，请添加并保存">
          <el-table-column label="商品" min-width="205"><template slot-scope="scope"><div class="product-name">
            <img v-if="image(scope.row)" :src="image(scope.row)" alt="参考图片"><div><strong>{{scope.row.title.zh}}</strong><small>{{scope.row.code}}</small></div>
          </div></template></el-table-column>
          <el-table-column label="方案价" min-width="175"><template slot-scope="scope">{{price(scope.row)}}</template></el-table-column>
          <el-table-column label="状态" min-width="170"><template slot-scope="scope">
            <el-tag :type="scope.row.status==='PUBLISHED'?'success':'info'">{{label(scope.row.status)}}</el-tag></template></el-table-column>
          <el-table-column label="版本" width="70" prop="version"></el-table-column>
          <el-table-column label="操作" min-width="300"><template slot-scope="scope">
            <el-button type="text" @click="edit(scope.row)" :disabled="saving">编辑</el-button>
            <el-button type="text" @click="chooseImage(scope.row)" :disabled="saving">上传主图</el-button>
            <el-button v-if="scope.row.hasCustomImage" type="text" @click="removeImage(scope.row)" :disabled="saving">移除上传主图</el-button>
            <a class="el-button el-button--text" :href="'/admin/commerce-lab/catalog/'+scope.row.id+'/preview'" target="_blank" rel="noopener noreferrer">预览</a>
            <el-button type="text" @click="publish(scope.row)" :disabled="saving">{{scope.row.status==='PUBLISHED'?'下架':'发布'}}</el-button>
          </template></el-table-column>
        </el-table></div>
        <el-pagination layout="prev,pager,next,total" :total="total" :page-size="artFrom.limit" :current-page.sync="artFrom.page"
          @current-change="load" class="pagination"></el-pagination>
      </el-card>
      <el-dialog :title="editId?'编辑实验商品':'添加实验商品'" :visible.sync="dialogVisible" :width="dialogWidth" :close-on-click-modal="false">
        <el-form label-position="top" @submit.native.prevent="save">
          <el-form-item label="实验编码（保存后固定）"><el-input v-model="form.code" @input="uppercaseCode" :disabled="!!editId" maxlength="41" placeholder="例如 FC1-STANDARD"></el-input></el-form-item>
          <div class="locale-fields" v-for="lang in locales" :key="lang.id">
            <el-form-item :label="lang.name+'名称（必填）'"><el-input v-model="form.title[lang.id]" maxlength="120"></el-input></el-form-item>
            <el-form-item :label="lang.name+'说明'"><el-input type="textarea" v-model="form.description[lang.id]" maxlength="2000" :rows="2"></el-input></el-form-item>
          </div>
          <div class="locale-fields"><el-form-item label="参考图片"><el-select v-model="form.referenceImage">
            <el-option label="不使用参考图" value=""></el-option><el-option label="FC1 参考图" value="FC1"></el-option>
            <el-option label="FC2 参考图" value="FC2"></el-option></el-select></el-form-item>
            <el-form-item label="方案价 EUR（可留空）"><el-input v-model="form.price" placeholder="例如 2599.00"></el-input></el-form-item></div>
          <el-form-item v-if="editId" label="发布状态"><el-select v-model="form.status">
            <el-option label="草稿" value="DRAFT"></el-option><el-option label="发布到独立产品页" value="PUBLISHED"></el-option>
            <el-option label="归档" value="ARCHIVED"></el-option></el-select></el-form-item>
          <p v-else>新建商品先保存为草稿，之后可在列表上传主图、预览，再决定发布。</p>
          <p v-if="editId">上传主图会优先显示；在列表移除上传主图后，才使用这里选择的参考图。</p>
        </el-form>
        <div slot="footer"><el-button @click="dialogVisible=false" :disabled="saving">取消</el-button>
          <el-button type="primary" @click="save" :loading="saving">保存</el-button></div>
      </el-dialog>
      <footer>Powered by CRMEB · ALSVID 适配 · <a href="./CRMEB-LICENSE.txt" target="_blank">许可证</a></footer>
    </div>`
  });
})();
