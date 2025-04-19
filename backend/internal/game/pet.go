package game

import (
	"math/rand"
	"strings"
)

// Pet represents a creature in the game
type Pet struct {
	ID      string
	DNA     string
	Stats   Stats
	Owner   string
	NFTID   string
}

// Stats represents the attributes of a pet
type Stats struct {
	Strength     int
	Speed        int
	Intelligence int
	Endurance    int
}

// NewPetFromDNA creates a new pet with stats derived from DNA
func NewPetFromDNA(id, dna, owner, nftID string) *Pet {
	if len(dna) < 32 {
		// Pad DNA if necessary
		dna = dna + strings.Repeat("0", 32-len(dna))
	}

	// Extract stats from DNA
	stats := Stats{
		Strength:     hexToStat(dna[0:8]),
		Speed:        hexToStat(dna[8:16]),
		Intelligence: hexToStat(dna[16:24]),
		Endurance:    hexToStat(dna[24:32]),
	}

	return &Pet{
		ID:      id,
		DNA:     dna,
		Stats:   stats,
		Owner:   owner,
		NFTID:   nftID,
	}
}

// hexToStat converts a hex string to a stat value (1-100)
func hexToStat(hex string) int {
	// Simple conversion for demo purposes
	// In a real implementation, we would use a more sophisticated algorithm
	sum := 0
	for _, r := range hex {
		sum += int(r)
	}
	return (sum % 100) + 1
}

// GenerateRandomDNA creates a random DNA string
func GenerateRandomDNA() string {
	const charset = "0123456789abcdef"
	dna := make([]byte, 32)
	for i := range dna {
		dna[i] = charset[rand.Intn(len(charset))]
	}
	return string(dna)
}