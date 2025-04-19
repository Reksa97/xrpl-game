package game

import (
	"math/rand"
)

// BattleResult represents the outcome of a battle
type BattleResult struct {
	Winner    *Pet
	Loser     *Pet
	Victory   bool  // From challenger's perspective
	Reward    int   // Spark tokens reward
	Rounds    int   // How many rounds the battle lasted
}

// Battle simulates a battle between two pets
func Battle(challenger, opponent *Pet) BattleResult {
	challengerHP := 100 + challenger.Stats.Endurance
	opponentHP := 100 + opponent.Stats.Endurance
	
	rounds := 0
	for challengerHP > 0 && opponentHP > 0 && rounds < 20 {
		// Challenger attacks
		attackPower := challenger.Stats.Strength + rand.Intn(20)
		defense := opponent.Stats.Speed/2 + rand.Intn(10)
		damage := max(1, attackPower-defense)
		opponentHP -= damage
		
		// Check if opponent is defeated
		if opponentHP <= 0 {
			break
		}
		
		// Opponent attacks
		attackPower = opponent.Stats.Strength + rand.Intn(20)
		defense = challenger.Stats.Speed/2 + rand.Intn(10)
		damage = max(1, attackPower-defense)
		challengerHP -= damage
		
		rounds++
	}
	
	victory := challengerHP > opponentHP
	reward := 10 // Base reward
	if victory {
		// Bonus reward based on rounds and stats
		reward += (20 - rounds) + (challenger.Stats.Intelligence / 10)
	}
	
	var winner, loser *Pet
	if victory {
		winner = challenger
		loser = opponent
	} else {
		winner = opponent
		loser = challenger
	}
	
	return BattleResult{
		Winner:  winner,
		Loser:   loser,
		Victory: victory,
		Reward:  reward,
		Rounds:  rounds,
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}