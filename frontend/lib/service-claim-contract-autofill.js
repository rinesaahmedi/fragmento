export function splitPersonName(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return { givenName: "", surname: "" };
  }

  if (parts.length === 1) {
    return { givenName: parts[0], surname: "" };
  }

  return {
    givenName: parts.slice(0, -1).join(" "),
    surname: parts[parts.length - 1],
  };
}

export function buildServiceClaimAutofillFromContract(contract) {
  const address = contract?.address || {};
  const landlord = contract?.landlord || {};
  const contact = splitPersonName(landlord.managerName);

  return {
    clientCountry: String(address.country || "").trim(),
    clientAddressLine1: String(address.address1 || "").trim(),
    clientAddressLine2: String(address.address2 || "").trim(),
    clientPostalCode: String(address.postalCode || "").trim(),
    clientCity: String(address.city || "").trim(),
    clientFloor: String(contract?.floor || "").trim(),
    clientUnitNumber: String(contract?.unitNumber || "").trim(),
    landlordCompanyName: String(landlord.companyName || "").trim(),
    landlordCompanyPhone: String(landlord.phone || "").trim(),
    landlordCompanyEmail: String(landlord.email || "").trim(),
    landlordContactGivenName: String(contact.givenName || "").trim(),
    landlordContactSurname: String(contact.surname || "").trim(),
  };
}
