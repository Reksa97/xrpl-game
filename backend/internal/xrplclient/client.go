package xrplclient

import (
	"context"
	"github.com/xyield/xrpl-go/client"
)

func New(url string) (*client.Client, error) {
	return client.New(context.Background(), url)
}