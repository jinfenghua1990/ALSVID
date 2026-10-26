import assert from 'node:assert/strict';
import test from 'node:test';
import {comparisonCreate,comparisonUpdate} from './core/comparison-catalog.js';
import {CommerceValidationError} from './core/errors.js';
const fields={title:{zh:'车型',de:'Fahrrad',en:'Bike'},description:{zh:'',de:'',en:''},referenceImage:null,proposedPriceMinor:null};
const specification={label:{zh:'电机扭矩',de:'Drehmoment',en:'Motor torque'},value:{zh:'90 Nm',de:'90 Nm',en:'90 Nm'},featured:true};

test('localized display specifications are bounded, explicit and preserve omitted update fields',()=>{
  assert.equal(comparisonCreate({code:'SPEC-CI',...fields}).specifications,undefined);
  assert.equal(comparisonUpdate({...fields,status:'DRAFT',expectedVersion:1}).specifications,undefined);
  assert.deepEqual(comparisonUpdate({...fields,status:'DRAFT',expectedVersion:1,specifications:[]}).specifications,[]);
  assert.deepEqual(comparisonCreate({code:'SPEC-CI',...fields,specifications:[specification]}).specifications,[specification]);
  const maxRows=Array.from({length:20},()=>({...specification,featured:false}));
  assert.equal(comparisonCreate({code:'SPEC-CI',...fields,specifications:maxRows}).specifications!.length,20);
  for(const specifications of [null,{},Array(21).fill({...specification,featured:false}),Array(5).fill(specification),
    [{...specification,featured:'yes'}],[{...specification,label:{zh:'名称'}}],
    [{...specification,value:{...specification.value,en:'   '}}],
    [{...specification,label:{...specification.label,en:'x'.repeat(61)}}],
    [{...specification,value:{...specification.value,de:'x'.repeat(161)}}],
    [{...specification,assetId:'not-a-display-field'}]]){
    assert.throws(()=>comparisonCreate({code:'SPEC-CI',...fields,specifications}),CommerceValidationError);
  }
});
