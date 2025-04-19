package main

import (
	"log"
	"math/rand"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type MatchRequest struct {
	Address string `json:"address"`
	PetID   string `json:"pet_id"`
}

type MatchResult struct {
	Victory bool   `json:"victory"`
	Reward  int    `json:"spark"`
}

func main() {
	rand.Seed(time.Now().UnixNano())
	r := gin.Default()
	r.POST("/match", func(c *gin.Context) {
		var req MatchRequest
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"err": err.Error()})
			return
		}
		// 50/50 win for demo
		win := rand.Intn(2) == 0
		reward := 10
		c.JSON(200, MatchResult{Victory: win, Reward: reward})
	})
	log.Fatal(r.Run(":8080"))
}