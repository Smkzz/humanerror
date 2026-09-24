import test from 'node:test';
import assert from 'node:assert/strict';
import { incrementGamesPlayed, leaderboardRank, localRank, readPlayerProfile, recordAdaptiveScore, recordSharedLeaderboard, sanitizePlayerName, withPlayerName } from '../build/modules/profile.js';

const entry=(name,score,extra={})=>({name,score,correct:10,attempted:10,bestStreak:10,recordedAt:1000,...extra});

test('player names are normalized, bounded and control-free',()=>{
 assert.equal(sanitizePlayerName('  Sami   Sytelä  '),'Sami Sytelä');
 assert.equal(sanitizePlayerName('A\u0000B\nC'),'ABC');
 assert.equal([...sanitizePlayerName('12345678901234567890')].length,18);
 assert.equal(sanitizePlayerName('\u202E\u2066\u2069'),'');
 assert.equal(sanitizePlayerName('\u200B\uFEFF'),'');
 assert.equal(sanitizePlayerName('Sami\u202E'),'Sami');
 assert.equal([...sanitizePlayerName('😀'.repeat(20))].length,18);
 assert.equal(sanitizePlayerName('   '),'');
});

test('profile reader fails closed and drops invalid leaderboard rows',()=>{
 assert.deepEqual(readPlayerProfile(null),{name:'',leaderboard:[],sharedLeaderboard:[],lastKnownRank:null,lastKnownRankAt:null,gamesPlayed:0});
 assert.deepEqual(readPlayerProfile('broken'),{name:'',leaderboard:[],sharedLeaderboard:[],lastKnownRank:null,lastKnownRankAt:null,gamesPlayed:0});
 const p=readPlayerProfile(JSON.stringify({name:' Sami ',leaderboard:[entry('Alice',100),{name:'Bad',score:-1,correct:0,attempted:0,bestStreak:0,recordedAt:1}]}));
 assert.equal(p.name,'Sami');assert.equal(p.leaderboard.length,1);assert.equal(p.leaderboard[0].name,'Alice');assert.deepEqual(p.sharedLeaderboard,[]);
});

test('changing player name never creates or transfers a score',()=>{
 let p=readPlayerProfile(null);
 p=recordAdaptiveScore(p,entry('Alice',5000));
 const before=p.leaderboard.map(x=>({...x}));
 p=withPlayerName(p,'Bob');
 assert.equal(p.name,'Bob');
 assert.deepEqual(p.leaderboard,before);
 assert.equal(localRank(p,'Bob'),null);
 assert.equal(localRank(p,'Alice'),1);
});

test('leaderboard keeps one best result per name and sorts score then accuracy then streak',()=>{
 let p=readPlayerProfile(null);
 p=recordAdaptiveScore(p,entry('Alice',1000,{correct:8,attempted:10,bestStreak:5,recordedAt:5}));
 p=recordAdaptiveScore(p,entry('Bob',1000,{correct:9,attempted:10,bestStreak:3,recordedAt:6}));
 p=recordAdaptiveScore(p,entry('alice',900,{correct:10,attempted:10,bestStreak:10,recordedAt:7}));
 assert.equal(p.leaderboard.length,2);assert.equal(p.leaderboard[0].name,'Bob');assert.equal(p.leaderboard[1].score,1000);
 p=recordAdaptiveScore(p,entry('ALICE',1200,{correct:7,attempted:10,bestStreak:4,recordedAt:8}));
 assert.equal(p.leaderboard.length,2);assert.equal(p.leaderboard[0].name,'ALICE');assert.equal(p.leaderboard[0].score,1200);
 assert.equal(localRank(p,'alice'),1);assert.equal(localRank(p,'nobody'),null);
});

test('leaderboard is bounded to ten players',()=>{
 let p=readPlayerProfile(null);
 for(let i=0;i<15;i++)p=recordAdaptiveScore(p,entry('P'+i,100+i,{recordedAt:i+1}));
 assert.equal(p.leaderboard.length,10);assert.equal(p.leaderboard[0].name,'P14');assert.equal(p.leaderboard.at(-1).name,'P5');
});

test('server-confirmed scores stay separate from migrated local scores',()=>{
 const legacy=entry('Sami',9000,{correct:0,attempted:0,bestStreak:0});
 let p=readPlayerProfile(JSON.stringify({name:'Sami',leaderboard:[legacy]}));
 p=recordSharedLeaderboard(p,[entry('Alice',1200),entry('Sami',1000)],2,2000);
 assert.equal(p.leaderboard[0].score,9000);assert.equal(p.sharedLeaderboard[1].name,'Sami');
 assert.equal(p.lastKnownRank,2);assert.equal(p.lastKnownRankAt,2000);
 assert.equal(localRank(p,'Sami'),1);assert.equal(leaderboardRank(p.sharedLeaderboard,'Sami'),2);
 p=incrementGamesPlayed(p);assert.equal(p.gamesPlayed,1);
 const restored=readPlayerProfile(JSON.stringify(p));assert.equal(restored.sharedLeaderboard.length,2);assert.equal(restored.lastKnownRank,2);assert.equal(restored.gamesPlayed,1);
});
