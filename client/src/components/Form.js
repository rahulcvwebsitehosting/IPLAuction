import Input from "./Input";
import Loader from "./Loading.component";

/*
Elements passed to form:

1) Title of the form
2) An array, where every element contains => type, placeholder, onChange, icon, error.
3) An additional message function, could be null.
4) onFormSubmit function
5) error 
6) loading

*/

const Form = ({
  title,
  data,
  onFormSubmit,
  message = () => {},
  error,
  loading,
}) => {
  const formId = `form-${
    title ? title.toLowerCase().replace(/\s+/g, "-") : "default"
  }-${Math.floor(Math.random() * 100000)}`;
  return (
    <div className="form">
      <div className="form-container">
        <h3 className="form-container-title">{title}</h3>
        <form id={formId} onSubmit={onFormSubmit} noValidate>
          {data.map((inputFields, index) => {
            return <Input key={index} {...inputFields} />;
          })}
          {!loading ? (
            <div className="center">
              {" "}
              <button type="submit" className="button">
                {title}
              </button>{" "}
            </div>
          ) : (
            <Loader size="2" />
          )}
        </form>
        <p className={error === "" ? "invisible" : "error"}>{error}</p>
        <div className="form-container-additional">{message()}</div>
      </div>
    </div>
  );
};

export default Form;
