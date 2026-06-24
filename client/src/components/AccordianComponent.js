const AccordianComponent = ({ title, players }) => {
  return (
    <div className="accordian-helper">
      <div className="accordian-helper-title">{title}:</div>
      <div className="accordian-helper-players">
        {players.map((player, index) => {
          return (
            <div className="accordian-helper-player" key={index}>
              {player.name}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AccordianComponent;
