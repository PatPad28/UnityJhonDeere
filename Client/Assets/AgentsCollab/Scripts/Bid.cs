using UnityEngine;

public class Bid
{
    public TractorAgent bidder;
    public float bidValue;
    
    public Bid(TractorAgent bidder, float bidValue)
    {
        this.bidder = bidder;
        this.bidValue = bidValue;
    }
}