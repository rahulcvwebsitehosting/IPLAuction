const {
  getIncrement,
  applyIncrement,
  validateBid,
} = require("../controller/bid.engine");

describe("getIncrement", () => {
  it("returns 5 for bids below 20", () => {
    expect(getIncrement(0)).toBe(5);
    expect(getIncrement(15)).toBe(5);
    expect(getIncrement(19)).toBe(5);
  });

  it("returns 5 for bids between 20 and 75", () => {
    expect(getIncrement(20)).toBe(5);
    expect(getIncrement(50)).toBe(5);
    expect(getIncrement(74)).toBe(5);
  });

  it("returns 10 for bids between 75 and 100", () => {
    expect(getIncrement(75)).toBe(10);
    expect(getIncrement(99)).toBe(10);
  });

  it("returns 25 for bids between 100 and 200", () => {
    expect(getIncrement(100)).toBe(25);
    expect(getIncrement(150)).toBe(25);
    expect(getIncrement(199)).toBe(25);
  });

  it("returns 50 for bids at or above 200", () => {
    expect(getIncrement(200)).toBe(50);
    expect(getIncrement(500)).toBe(50);
    expect(getIncrement(Infinity)).toBe(50);
  });
});

describe("applyIncrement", () => {
  it("adds the correct tier increment", () => {
    expect(applyIncrement(0)).toBe(5);
    expect(applyIncrement(20)).toBe(25);
    expect(applyIncrement(75)).toBe(85);
    expect(applyIncrement(100)).toBe(125);
    expect(applyIncrement(200)).toBe(250);
  });
});

function makeMachine(overrides = {}) {
  return {
    currentPlayerId: "p1",
    currentPlayerState: "OPEN",
    timerRemaining: 10,
    currentBid: 0,
    currentHighBidder: null,
    settings: {
      maxSquadSize: 25,
      overseasLimit: 8,
      ...overrides.settings,
    },
    ...overrides,
  };
}

function makeTeamPlayer(overrides = {}) {
  return {
    userId: "user1",
    purseRemaining: 12000,
    totalPlayers: 0,
    overseasUsed: 0,
    ...overrides,
  };
}

describe("validateBid", () => {
  it("accepts a valid first bid", () => {
    const machine = makeMachine();
    const tp = makeTeamPlayer();
    expect(validateBid(machine, tp, false)).toEqual({ valid: true });
  });

  it("rejects bid when no current player", () => {
    const machine = makeMachine({ currentPlayerId: null });
    const tp = makeTeamPlayer();
    expect(validateBid(machine, tp, false)).toEqual({
      valid: false,
      errorCode: "PLAYER_NOT_OPEN",
    });
  });

  it("rejects bid when player state is not OPEN or BIDDING_ACTIVE", () => {
    const machine = makeMachine({ currentPlayerState: "SOLD" });
    const tp = makeTeamPlayer();
    expect(validateBid(machine, tp, false)).toEqual({
      valid: false,
      errorCode: "PLAYER_NOT_OPEN",
    });
  });

  it("rejects bid when timer expired", () => {
    const machine = makeMachine({ timerRemaining: 0 });
    const tp = makeTeamPlayer();
    expect(validateBid(machine, tp, false)).toEqual({
      valid: false,
      errorCode: "TIMER_EXPIRED",
    });
  });

  it("rejects self-bid", () => {
    const machine = makeMachine({ currentHighBidder: "user1" });
    const tp = makeTeamPlayer({ userId: "user1" });
    expect(validateBid(machine, tp, false)).toEqual({
      valid: false,
      errorCode: "SELF_BID",
    });
  });

  it("rejects bid when insufficient funds", () => {
    const machine = makeMachine({ currentBid: 11900 });
    const tp = makeTeamPlayer({ purseRemaining: 11900 });
    expect(validateBid(machine, tp, false)).toEqual({
      valid: false,
      errorCode: "INSUFFICIENT_FUNDS",
    });
  });

  it("rejects bid when squad is full", () => {
    const machine = makeMachine({
      settings: { maxSquadSize: 25, overseasLimit: 8 },
    });
    const tp = makeTeamPlayer({ totalPlayers: 25 });
    expect(validateBid(machine, tp, false)).toEqual({
      valid: false,
      errorCode: "SQUAD_FULL",
    });
  });

  it("rejects overseas bid when overseas limit reached", () => {
    const machine = makeMachine({
      settings: { maxSquadSize: 25, overseasLimit: 8 },
    });
    const tp = makeTeamPlayer({ overseasUsed: 8 });
    expect(validateBid(machine, tp, true)).toEqual({
      valid: false,
      errorCode: "OVERSEAS_FULL",
    });
  });

  it("allows overseas bid when under limit", () => {
    const machine = makeMachine({
      settings: { maxSquadSize: 25, overseasLimit: 8 },
    });
    const tp = makeTeamPlayer({ overseasUsed: 7 });
    expect(validateBid(machine, tp, true)).toEqual({ valid: true });
  });

  it("accepts bid at exact purse boundary", () => {
    const machine = makeMachine({ currentBid: 0 });
    const tp = makeTeamPlayer({ purseRemaining: 5 });
    expect(validateBid(machine, tp, false)).toEqual({ valid: true });
  });
});
