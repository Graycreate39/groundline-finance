import test from 'node:test';import assert from 'node:assert/strict';import {dcf,runway,financing,reverseRevenue,seededSimulation,attribution} from '../src/engine.mjs';
const base={revenue:100,growths:[.2,.18,.15,.12,.1],ebitdaMargins:[.1,.15,.2,.23,.25],taxRate:.25,daPct:.03,capexPct:.04,nwcPct:.02,wacc:.1,terminalGrowth:.03,netCash:20,shares:10};
test('DCF reconciles EV to equity and discounts cash flows',()=>{const x=dcf(base);assert.equal(x.years.length,5);assert(x.bridgeCheck);assert(x.equityValue>x.enterpriseValue);});
test('runway propagates monthly growth deterministically',()=>{const x=runway({openingCash:1e6,monthlyRevenue:1e5,monthlyPayroll:2e5,monthlyOpex:5e4});assert.equal(x.runway,7);assert.equal(x.schedule.length,36);});
test('financing ownership fully reconciles',()=>{const x=financing({preMoney:70,investment:30,founders:.8,employees:.2,optionPoolTopUp:.1});assert(Math.abs(Object.values(x).slice(0,5).reduce((a,b)=>a+b,0)-1)<1e-9);});
test('reverse solve reaches target enterprise value',()=>{const target=500;const r=reverseRevenue(target,base);assert(Math.abs(dcf({...base,revenue:r}).enterpriseValue-target)<1e-6);});
test('seeded uncertainty is reproducible',()=>assert.deepEqual(seededSimulation(42,30,base),seededSimulation(42,30,base)));
test('attribution exposes changes and residual',()=>{const x=attribution(base,{wacc:.11,terminalGrowth:.025},v=>dcf(v).enterpriseValue);assert.equal(x.items.length,2);assert(Math.abs(x.end-x.start-x.items.reduce((s,i)=>s+i.impact,0)-x.residual)<1e-8);});
