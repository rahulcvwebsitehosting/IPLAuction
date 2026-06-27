const LoaderComponent = ({ size = 3 }) => {
  return (
    <div className="loader" style={{ "--size": size + "rem" }}>
      <div className="loader-spinner" />
    </div>
  );
};

export default LoaderComponent;
